export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum BranchStatus {
  ACTIVE = 'active',
  MERGED = 'merged',
  REJECTED = 'rejected',
  DELETED = 'deleted',
}

export enum FeatureStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
}

export enum MergeRequestStatus {
  DRAFT = 'draft',
  REVIEWING = 'reviewing',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CONFLICT = 'conflict',
  CANCELLED = 'cancelled',
}

export enum ChangeType {
  ADD = 'add',
  MODIFY = 'modify',
  DELETE = 'delete',
}
