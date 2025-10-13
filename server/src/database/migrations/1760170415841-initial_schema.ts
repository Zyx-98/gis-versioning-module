import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1760170415841 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create departments table
    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM('admin', 'member')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL UNIQUE,
        "name" varchar NOT NULL,
        "password" varchar NOT NULL,
        "role" user_role_enum NOT NULL,
        "department_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_user_department" FOREIGN KEY ("department_id") 
          REFERENCES "departments"("id") ON DELETE CASCADE
      )
    `);

    // Create datasets table
    await queryRunner.query(`
      CREATE TABLE "datasets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "description" text,
        "geo_type" varchar NOT NULL,
        "department_id" uuid NOT NULL,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_dataset_department" FOREIGN KEY ("department_id") 
          REFERENCES "departments"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_dataset_creator" FOREIGN KEY ("created_by") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create branches table
    await queryRunner.query(`
      CREATE TYPE "branch_status_enum" AS ENUM('active', 'merged', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "is_main" boolean DEFAULT false,
        "dataset_id" uuid NOT NULL,
        "created_by" uuid NOT NULL,
        "branched_from" uuid,
        "status" branch_status_enum DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_branch_dataset" FOREIGN KEY ("dataset_id") 
          REFERENCES "datasets"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_branch_creator" FOREIGN KEY ("created_by") 
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "unique_branch_name_per_dataset" UNIQUE ("dataset_id", "name", "status")
      )
    `);

    // Create features table with PostGIS geometry
    await queryRunner.query(`
      CREATE TYPE "feature_status_enum" AS ENUM('active', 'deleted')
    `);

    await queryRunner.query(`
      CREATE TABLE "features" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "dataset_id" uuid NOT NULL,
        "branch_id" uuid NOT NULL,
        "geometry" geometry(Geometry, 4326) NOT NULL,
        "properties" jsonb,
        "status" feature_status_enum DEFAULT 'active',
        "version" int DEFAULT 1,
        "parent_feature_id" uuid,
        "parent_version" int NULL,
        "created_by" uuid NOT NULL,
        "updated_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_feature_dataset" FOREIGN KEY ("dataset_id") 
          REFERENCES "datasets"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_feature_branch" FOREIGN KEY ("branch_id") 
          REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_feature_creator" FOREIGN KEY ("created_by") 
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_feature_updater" FOREIGN KEY ("updated_by") 
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create spatial index on geometry
    await queryRunner.query(`
      CREATE INDEX "idx_features_geometry" ON "features" USING GIST ("geometry")
    `);

    // Create merge_requests table
    await queryRunner.query(`
      CREATE TYPE "merge_request_status_enum" AS ENUM('pending', 'approved', 'rejected', 'conflict')
    `);

    await queryRunner.query(`
      CREATE TABLE "merge_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "source_branch_id" uuid NOT NULL,
        "target_branch_id" uuid NOT NULL,
        "description" text,
        "status" merge_request_status_enum DEFAULT 'pending',
        "created_by" uuid NOT NULL,
        "reviewed_by" uuid,
        "review_comment" text,
        "conflicts" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "reviewed_at" TIMESTAMP,
        CONSTRAINT "fk_mr_source_branch" FOREIGN KEY ("source_branch_id") 
          REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_mr_target_branch" FOREIGN KEY ("target_branch_id") 
          REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_mr_creator" FOREIGN KEY ("created_by") 
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_mr_reviewer" FOREIGN KEY ("reviewed_by") 
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create feature_changes table
    await queryRunner.query(`
      CREATE TYPE "change_type_enum" AS ENUM('add', 'modify', 'delete')
    `);

    await queryRunner.query(`
      CREATE TABLE "feature_changes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "merge_request_id" uuid NOT NULL,
        "feature_id" uuid NOT NULL,
        "change_type" change_type_enum NOT NULL,
        "before_data" jsonb,
        "after_data" jsonb,
        "has_conflict" boolean DEFAULT false,
        "conflict_data" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_change_merge_request" FOREIGN KEY ("merge_request_id") 
          REFERENCES "merge_requests"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(
      `CREATE INDEX "idx_users_department" ON "users"("department_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_datasets_department" ON "datasets"("department_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_branches_dataset" ON "branches"("dataset_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_features_branch" ON "features"("branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_features_parent" ON "features"("parent_feature_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_mr_source_branch" ON "merge_requests"("source_branch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_mr_status" ON "merge_requests"("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_changes_merge_request" ON "feature_changes"("merge_request_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "feature_changes"`);
    await queryRunner.query(`DROP TABLE "merge_requests"`);
    await queryRunner.query(`DROP TABLE "features"`);
    await queryRunner.query(`DROP TABLE "branches"`);
    await queryRunner.query(`DROP TABLE "datasets"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "departments"`);
    await queryRunner.query(`DROP TYPE "change_type_enum"`);
    await queryRunner.query(`DROP TYPE "merge_request_status_enum"`);
    await queryRunner.query(`DROP TYPE "feature_status_enum"`);
    await queryRunner.query(`DROP TYPE "branch_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
