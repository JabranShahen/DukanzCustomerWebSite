export interface CustomerOrder {
  id: string;
  status: string;
  orderItems: CustomerOrderItem[];
}

export interface CustomerOrderItem {
  id: string;
  quantity: number;
  product?: {
    id: string;
    productName: string;
  };
}

export interface ClaimSummary {
  claimId: string;
  orderId: string;
  status: string;
  issueTypes: string[];
  itemCount: number;
  attachmentCount: number;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface ClaimUploadFile {
  clientAttachmentId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface ClaimUploadSessionResponse {
  uploadSessionId: string;
  expiresAtUtc: string;
  containerName: string;
  uploads: ClaimUploadTarget[];
}

export interface ClaimUploadTarget {
  clientAttachmentId: string;
  blobPath: string;
  uploadUrl: string;
  expiresAtUtc: string;
}

export interface ClaimCreateRequest {
  orderId: string;
  idempotencyKey: string;
  items: ClaimCreateItem[];
  attachments: ClaimAttachmentRequest[];
}

export interface ClaimCreateItem {
  orderItemId: string;
  productId: string;
  productName: string;
  issueType: 'Faulty' | 'Expired' | 'Incomplete';
  quantityClaimed: number;
  description: string;
}

export interface ClaimAttachmentRequest {
  clientAttachmentId: string;
  blobPath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  orderItemId: string;
}

export interface ClaimCreateResponse {
  claimId: string;
  status: string;
  createdAt: string;
  idempotentReplay?: boolean;
}
