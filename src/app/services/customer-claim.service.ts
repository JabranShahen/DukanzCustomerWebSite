import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import {
  ClaimCreateRequest,
  ClaimCreateResponse,
  ClaimSummary,
  ClaimUploadFile,
  ClaimUploadSessionResponse,
  CustomerOrder
} from '../models/customer-claim.model';

@Injectable({ providedIn: 'root' })
export class CustomerClaimService {
  private readonly apiBaseUrl = this.resolveApiBaseUrl();

  constructor(private readonly http: HttpClient) {}

  getOrder(orderId: string): Observable<CustomerOrder> {
    return this.http.get<CustomerOrder>(`${this.apiBaseUrl}/Order/${encodeURIComponent(orderId)}`, {
      headers: this.authHeaders()
    });
  }

  getClaimsForOrder(orderId: string): Observable<ClaimSummary[]> {
    const params = new HttpParams().set('orderId', orderId);
    return this.http.get<ClaimSummary[]>(`${this.apiBaseUrl}/Claims/my`, {
      headers: this.authHeaders(),
      params
    });
  }

  submitClaim(request: ClaimCreateRequest, files: File[]): Observable<ClaimCreateResponse> {
    if (files.length === 0) {
      return this.createClaim(request);
    }

    const uploadFiles: ClaimUploadFile[] = files.map((file, index) => ({
      clientAttachmentId: `file-${index}`,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size
    }));

    return this.http
      .post<ClaimUploadSessionResponse>(
        `${this.apiBaseUrl}/Claims/upload-session`,
        {
          orderId: request.orderId,
          idempotencyKey: request.idempotencyKey,
          files: uploadFiles
        },
        { headers: this.authHeaders() }
      )
      .pipe(
        switchMap((session) => {
          const uploads = session.uploads.map((target, index) =>
            this.uploadFile(target.uploadUrl, files[index]).pipe(map(() => ({ target, file: files[index] })))
          );
          return uploads.length === 0 ? of([]) : forkJoin(uploads);
        }),
        switchMap((uploaded) => {
          const firstItemId = request.items[0]?.orderItemId ?? '';
          const attachments = uploaded.map(({ target, file }) => ({
            clientAttachmentId: target.clientAttachmentId,
            blobPath: target.blobPath,
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
            orderItemId: firstItemId
          }));
          return this.createClaim({ ...request, attachments });
        })
      );
  }

  private createClaim(request: ClaimCreateRequest): Observable<ClaimCreateResponse> {
    return this.http.post<ClaimCreateResponse>(`${this.apiBaseUrl}/Claims`, request, {
      headers: this.authHeaders().set('Idempotency-Key', request.idempotencyKey)
    });
  }

  private uploadFile(uploadUrl: string, file: File): Observable<unknown> {
    return this.http.put(uploadUrl, file, {
      headers: new HttpHeaders({
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': file.type
      }),
      responseType: 'text'
    });
  }

  private authHeaders(): HttpHeaders {
    const token = globalThis.localStorage?.getItem('dukanzCustomerToken') ?? '';
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private resolveApiBaseUrl(): string {
    const configured = globalThis.localStorage?.getItem('dukanzApiBaseUrl');
    return configured?.replace(/\/$/, '') || '/api';
  }
}
