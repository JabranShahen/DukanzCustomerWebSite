import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import {
  ClaimCreateItem,
  ClaimSummary,
  CustomerOrder,
  CustomerOrderItem
} from '../../models/customer-claim.model';
import { CustomerClaimService } from '../../services/customer-claim.service';

type ClaimIssueType = 'Faulty' | 'Expired' | 'Incomplete';

interface ClaimItemDraft {
  selected: boolean;
  issueType: ClaimIssueType;
  quantityClaimed: number;
  description: string;
}

@Component({
  selector: 'app-order-claim-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './order-claim-page.component.html',
  styleUrl: './order-claim-page.component.css'
})
export class OrderClaimPageComponent implements OnInit {
  orderId = '';
  order: CustomerOrder | null = null;
  claims: ClaimSummary[] = [];
  drafts: Record<string, ClaimItemDraft> = {};
  files: File[] = [];
  loading = true;
  submitting = false;
  errorMessage = '';
  confirmationClaimId = '';

  readonly issueTypes: ClaimIssueType[] = ['Faulty', 'Expired', 'Incomplete'];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly claimService: CustomerClaimService
  ) {}

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('orderId') ?? '';
    this.load();
  }

  get canReport(): boolean {
    return (this.order?.status ?? '').toLowerCase() === 'delivered';
  }

  get selectedCount(): number {
    return Object.values(this.drafts).filter((draft) => draft.selected).length;
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.claimService
      .getOrder(this.orderId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (order) => {
          this.order = order;
          this.drafts = Object.fromEntries(
            (order.orderItems ?? []).map((item) => [
              item.id,
              {
                selected: false,
                issueType: 'Incomplete' as ClaimIssueType,
                quantityClaimed: 1,
                description: ''
              }
            ])
          );
          this.loadClaims();
        },
        error: () => {
          this.errorMessage = 'Order unavailable.';
        }
      });
  }

  loadClaims(): void {
    this.claimService.getClaimsForOrder(this.orderId).subscribe({
      next: (claims) => {
        this.claims = claims;
      },
      error: () => {
        this.claims = [];
      }
    });
  }

  toggleItem(item: CustomerOrderItem): void {
    const draft = this.drafts[item.id];
    if (!draft) {
      return;
    }

    draft.selected = !draft.selected;
    if (draft.quantityClaimed < 1) {
      draft.quantityClaimed = 1;
    }
  }

  updateQuantity(item: CustomerOrderItem, value: string): void {
    const draft = this.drafts[item.id];
    if (!draft) {
      return;
    }

    const parsed = Number(value);
    const max = Math.max(1, item.quantity || 1);
    draft.quantityClaimed = Math.min(Math.max(1, Number.isFinite(parsed) ? parsed : 1), max);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    const combined = [...this.files, ...selected];
    const valid = combined.filter((file) => this.isValidFile(file));

    if (combined.length > 5) {
      this.errorMessage = 'AttachmentLimitExceeded';
      this.files = valid.slice(0, 5);
      input.value = '';
      return;
    }

    if (valid.length !== combined.length) {
      this.errorMessage = 'InvalidAttachment';
      this.files = valid.slice(0, 5);
      input.value = '';
      return;
    }

    this.errorMessage = '';
    this.files = valid;
    input.value = '';
  }

  removeFile(file: File): void {
    this.files = this.files.filter((candidate) => candidate !== file);
  }

  submit(): void {
    if (!this.order || !this.canReport || this.submitting) {
      return;
    }

    const items = this.buildClaimItems();
    if (items.length === 0) {
      this.errorMessage = 'InvalidClaimItem';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.claimService
      .submitClaim(
        {
          orderId: this.order.id,
          idempotencyKey: crypto.randomUUID(),
          items,
          attachments: []
        },
        this.files
      )
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (response) => {
          this.confirmationClaimId = response.claimId;
          this.files = [];
          Object.values(this.drafts).forEach((draft) => {
            draft.selected = false;
            draft.description = '';
            draft.quantityClaimed = 1;
          });
          this.loadClaims();
        },
        error: (error) => {
          this.errorMessage = error?.error?.code ?? 'ClaimSubmitFailed';
        }
      });
  }

  private buildClaimItems(): ClaimCreateItem[] {
    return (this.order?.orderItems ?? [])
      .filter((item) => this.drafts[item.id]?.selected)
      .map((item) => {
        const draft = this.drafts[item.id];
        return {
          orderItemId: item.id,
          productId: item.product?.id ?? '',
          productName: item.product?.productName ?? item.id,
          issueType: draft.issueType,
          quantityClaimed: draft.quantityClaimed,
          description: draft.description.trim()
        };
      });
  }

  private isValidFile(file: File): boolean {
    const allowed = ['image/jpeg', 'image/png'];
    return allowed.includes(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024;
  }
}
