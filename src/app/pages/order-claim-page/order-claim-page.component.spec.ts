import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CustomerClaimService } from '../../services/customer-claim.service';
import { OrderClaimPageComponent } from './order-claim-page.component';

describe('OrderClaimPageComponent', () => {
  let fixture: ComponentFixture<OrderClaimPageComponent>;
  let service: {
    getOrder: ReturnType<typeof vi.fn>;
    getClaimsForOrder: ReturnType<typeof vi.fn>;
    submitClaim: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      getOrder: vi.fn(),
      getClaimsForOrder: vi.fn(),
      submitClaim: vi.fn()
    };
    service.getOrder.mockReturnValue(
      of({
        id: 'order-1',
        status: 'Delivered',
        orderItems: [
          {
            id: 'item-1',
            quantity: 2,
            product: { id: 'product-1', productName: 'Milk' }
          }
        ]
      })
    );
    service.getClaimsForOrder.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [OrderClaimPageComponent],
      providers: [
        { provide: CustomerClaimService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ orderId: 'order-1' })
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderClaimPageComponent);
    fixture.detectChanges();
  });

  it('shows report action for Delivered orders', () => {
    expect(fixture.nativeElement.textContent).toContain('Report issue');
    expect(fixture.componentInstance.canReport).toBe(true);
  });

  it('rejects more than five photos before submit', () => {
    const component = fixture.componentInstance;
    const files = Array.from({ length: 6 }, (_, index) =>
      new File(['x'], `file-${index}.jpg`, { type: 'image/jpeg' })
    );
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: files });

    component.onFilesSelected({ target: input } as unknown as Event);

    expect(component.errorMessage).toBe('AttachmentLimitExceeded');
    expect(component.files.length).toBe(5);
  });

  it('submits selected item with optional photos omitted', () => {
    service.submitClaim.mockReturnValue(
      of({
        claimId: 'claim-1',
        status: 'Submitted',
        createdAt: new Date().toISOString()
      })
    );
    const component = fixture.componentInstance;
    component.toggleItem(component.order!.orderItems[0]);

    component.submit();

    expect(service.submitClaim).toHaveBeenCalled();
    const [request, files] = service.submitClaim.mock.calls.at(-1)!;
    expect(files).toEqual([]);
    expect(request.items[0].orderItemId).toBe('item-1');
  });

  it('surfaces API error code', () => {
    service.submitClaim.mockReturnValue(throwError(() => ({ error: { code: 'DuplicateClaim' } })));
    const component = fixture.componentInstance;
    component.toggleItem(component.order!.orderItems[0]);

    component.submit();

    expect(component.errorMessage).toBe('DuplicateClaim');
  });
});
