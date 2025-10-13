import dataSource from 'data-source';
import * as bcrypt from 'bcrypt';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { Dataset } from '../entities/dataset.entity';
import { Branch } from '../entities/branch.entity';
import { Feature } from '../entities/feature.entity';
import { BranchStatus, FeatureStatus, UserRole } from '../enums';

async function seed() {
  try {
    await dataSource.initialize();
    console.log('Database connected successfully');

    // Truncate tables
    await dataSource.query(
      'TRUNCATE TABLE features, branches, datasets, users, departments CASCADE',
    );

    // Create Department
    console.log('\nCreating department...');

    const department = dataSource.getRepository(Department).create({
      name: 'Department of Transportation',
      description: 'Manages transportation infrastructure and road networks',
    });
    await dataSource.getRepository(Department).save(department);
    console.log(`Created: ${department.name}`);

    // Create Users
    console.log('\n👥 Creating users...');

    // Admin
    const admin = dataSource.getRepository(User).create({
      email: 'admin@example.com',
      name: 'Admin User',
      password: await bcrypt.hash('Admin123!', 10),
      role: UserRole.ADMIN,
      departmentId: department.id,
    });
    await dataSource.getRepository(User).save(admin);
    console.log(`✓ Created Admin: ${admin.email} / Admin123!`);

    // Member 1
    const member1 = dataSource.getRepository(User).create({
      email: 'member1@example.com',
      name: 'Member One',
      password: await bcrypt.hash('Member123!', 10),
      role: UserRole.MEMBER,
      departmentId: department.id,
    });
    await dataSource.getRepository(User).save(member1);
    console.log(`✓ Created Member: ${member1.email} / Member123!`);

    // Member 2
    const member2 = dataSource.getRepository(User).create({
      email: 'member2@example.com',
      name: 'Member Two',
      password: await bcrypt.hash('Member123!', 10),
      role: UserRole.MEMBER,
      departmentId: department.id,
    });
    await dataSource.getRepository(User).save(member2);
    console.log(`✓ Created Member: ${member2.email} / Member123!`);

    console.log('\n🗺️  Creating dataset...');

    // Dataset: Hanoi Roads
    const dataset = dataSource.getRepository(Dataset).create({
      name: 'Hanoi Road Network',
      description:
        'Complete road network for Hanoi city including highways, main roads, and streets',
      geoType: 'line',
      departmentId: department.id,
      createdById: admin.id,
    });
    await dataSource.getRepository(Dataset).save(dataset);
    console.log(`✓ Created: ${dataset.name}`);

    console.log('\n🌿 Creating main branch...');

    const mainBranch = dataSource.getRepository(Branch).create({
      name: 'main',
      isMain: true,
      datasetId: dataset.id,
      createdById: admin.id,
      status: BranchStatus.ACTIVE,
    });
    await dataSource.getRepository(Branch).save(mainBranch);
    console.log(`✓ Created main branch for: ${dataset.name}`);

    console.log('\n🛣️  Adding road features...');

    const roads = [
      {
        name: 'Đường Láng',
        type: 'major_road',
        lanes: 4,
        maxSpeed: 60,
        coordinates: [
          [105.8042, 21.0245], // Start near Kim Ma
          [105.8089, 21.0278], // Through Giang Vo
          [105.8145, 21.0312], // End near Lang Ha
        ],
      },
      {
        name: 'Phố Huế',
        type: 'main_street',
        lanes: 4,
        maxSpeed: 50,
        coordinates: [
          [105.8489, 21.0245], // Start near Hoan Kiem Lake
          [105.8501, 21.0189], // Through Old Quarter
          [105.8512, 21.0145], // End
        ],
      },
      {
        name: 'Đại lộ Thăng Long',
        type: 'highway',
        lanes: 8,
        maxSpeed: 100,
        coordinates: [
          [105.7834, 21.0389], // Start
          [105.7923, 21.0412], // Mid
          [105.8045, 21.0445], // Through My Dinh
          [105.8167, 21.0478], // End
        ],
      },
      {
        name: 'Đường Trường Chinh',
        type: 'major_road',
        lanes: 6,
        maxSpeed: 60,
        coordinates: [
          [105.8245, 21.0078], // Start
          [105.8301, 21.0112], // Mid
          [105.8356, 21.0145], // End
        ],
      },
      {
        name: 'Cầu Nhật Tân',
        type: 'bridge',
        lanes: 6,
        maxSpeed: 80,
        coordinates: [
          [105.7834, 21.0889], // West Bank
          [105.7901, 21.0901], // Mid span
          [105.7967, 21.0912], // East Bank
        ],
      },
    ];

    for (const road of roads) {
      const feature = dataSource.getRepository(Feature).create({
        datasetId: dataset.id,
        branchId: mainBranch.id,
        geometry: {
          type: 'LineString',
          coordinates: road.coordinates,
        },
        properties: {
          name: road.name,
          type: road.type,
          lanes: road.lanes,
          maxSpeed: road.maxSpeed,
          surface: 'asphalt',
          status: 'operational',
        },
        status: FeatureStatus.ACTIVE,
        version: 1,
        createdById: admin.id,
      });
      await dataSource.getRepository(Feature).save(feature);
      console.log(`  ✓ ${road.name}`);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Seed data created successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log(`  • Departments: 1`);
    console.log(`  • Users: 3 (1 admin, 2 members)`);
    console.log(`  • Datasets: 1`);
    console.log(`  • Main Branches: 1`);
    console.log(`  • Road Features: ${roads.length}`);

    console.log('\n🔐 Login Credentials:');
    console.log('\n  Admin:');
    console.log('    Email: admin@example.com');
    console.log('    Pass:  Admin123!');
    console.log('\n  Member 1:');
    console.log('    Email: member1@example.com');
    console.log('    Pass:  Member123!');
    console.log('\n  Member 2:');
    console.log('    Email: member2@example.com');
    console.log('    Pass:  Member123!');

    console.log('\n🗺️  Geographic Coverage:');
    console.log('  • City: Hanoi, Vietnam');
    console.log('  • Coordinates: ~105.8° E, ~21.0° N');
    console.log('  • Districts: Hoan Kiem, Ba Dinh, Cau Giay, Dong Da');
    console.log('═══════════════════════════════════════════════════\n');

    await dataSource.destroy();
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed
seed();
