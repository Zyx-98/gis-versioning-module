export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum BranchStatus {
  ACTIVE = 'active',
  MERGED = 'merged',
  REJECTED = 'rejected',
}

export enum FeatureStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
}

export enum MergeRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CONFLICT = 'conflict',
}

export enum ChangeType {
  ADD = 'add',
  MODIFY = 'modify',
  DELETE = 'delete',
}
