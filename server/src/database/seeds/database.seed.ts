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

    // Create Departments
    console.log('\nCreating departments...');

    const deptTransport = dataSource.getRepository(Department).create({
      name: 'Department of Transportation',
      description: 'Manages transportation infrastructure and road networks',
    });
    await dataSource.getRepository(Department).save(deptTransport);
    console.log(`Created: ${deptTransport.name}`);

    const deptUrban = dataSource.getRepository(Department).create({
      name: 'Urban Planning Department',
      description: 'City planning and infrastructure development',
    });
    await dataSource.getRepository(Department).save(deptUrban);
    console.log(`Created: ${deptUrban.name}`);

    // Create Users
    console.log('\n👥 Creating users...');

    // Admin for Transportation Department
    const adminTransport = dataSource.getRepository(User).create({
      email: 'admin.transport@email.vn',
      name: 'Transport Admin',
      password: await bcrypt.hash('Admin123!', 10),
      role: UserRole.ADMIN,
      departmentId: deptTransport.id,
    });
    await dataSource.getRepository(User).save(adminTransport);
    console.log(`✓ Created Admin: ${adminTransport.email} / Admin123!`);

    // Member 1 for Transportation Department
    const member1Transport = dataSource.getRepository(User).create({
      email: 'member1.transport@email.vn',
      name: 'Transport Member 1',
      password: await bcrypt.hash('Member123!', 10),
      role: UserRole.MEMBER,
      departmentId: deptTransport.id,
    });
    await dataSource.getRepository(User).save(member1Transport);
    console.log(`✓ Created Member: ${member1Transport.email} / Member123!`);

    // Member 2 for Transportation Department
    const member2Transport = dataSource.getRepository(User).create({
      email: 'member2.transport@email.vn',
      name: 'Transport Member 2',
      password: await bcrypt.hash('Member123!', 10),
      role: UserRole.MEMBER,
      departmentId: deptTransport.id,
    });
    await dataSource.getRepository(User).save(member2Transport);
    console.log(`✓ Created Member: ${member2Transport.email} / Member123!`);

    // Admin for Urban Planning
    const adminUrban = dataSource.getRepository(User).create({
      email: 'admin.urban@email.vn',
      name: 'Urban Admin',
      password: await bcrypt.hash('Admin123!', 10),
      role: UserRole.ADMIN,
      departmentId: deptUrban.id,
    });
    await dataSource.getRepository(User).save(adminUrban);
    console.log(`✓ Created Admin: ${adminUrban.email} / Admin123!`);

    console.log('\n🗺️  Creating datasets...');

    // Dataset 1: Hanoi Roads
    const datasetRoads = dataSource.getRepository(Dataset).create({
      name: 'Hanoi Road Network',
      description:
        'Complete road network for Hanoi city including highways, main roads, and streets',
      geoType: 'line',
      departmentId: deptTransport.id,
      createdById: adminTransport.id,
    });
    await dataSource.getRepository(Dataset).save(datasetRoads);
    console.log(`✓ Created: ${datasetRoads.name}`);

    // Dataset 2: Public Transport Stops
    const datasetStops = dataSource.getRepository(Dataset).create({
      name: 'Public Transport Stops',
      description: 'Bus stops and metro stations in Hanoi',
      geoType: 'point',
      departmentId: deptTransport.id,
      createdById: adminTransport.id,
    });
    await dataSource.getRepository(Dataset).save(datasetStops);
    console.log(`✓ Created: ${datasetStops.name}`);

    // Dataset 3: Parks and Green Spaces
    const datasetParks = dataSource.getRepository(Dataset).create({
      name: 'Hanoi Parks and Green Spaces',
      description: 'Public parks, lakes, and green areas',
      geoType: 'polygon',
      departmentId: deptUrban.id,
      createdById: adminUrban.id,
    });
    await dataSource.getRepository(Dataset).save(datasetParks);
    console.log(`✓ Created: ${datasetParks.name}`);

    console.log('\n🌿 Creating main branches...');

    const mainBranchRoads = dataSource.getRepository(Branch).create({
      name: 'main',
      isMain: true,
      datasetId: datasetRoads.id,
      createdById: adminTransport.id,
      status: BranchStatus.ACTIVE,
    });
    await dataSource.getRepository(Branch).save(mainBranchRoads);
    console.log(`✓ Created main branch for: ${datasetRoads.name}`);

    const mainBranchStops = dataSource.getRepository(Branch).create({
      name: 'main',
      isMain: true,
      datasetId: datasetStops.id,
      createdById: adminTransport.id,
      status: BranchStatus.ACTIVE,
    });
    await dataSource.getRepository(Branch).save(mainBranchStops);
    console.log(`✓ Created main branch for: ${datasetStops.name}`);

    const mainBranchParks = dataSource.getRepository(Branch).create({
      name: 'main',
      isMain: true,
      datasetId: datasetParks.id,
      createdById: adminUrban.id,
      status: BranchStatus.ACTIVE,
    });
    await dataSource.getRepository(Branch).save(mainBranchParks);
    console.log(`✓ Created main branch for: ${datasetParks.name}`);

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
        datasetId: datasetRoads.id,
        branchId: mainBranchRoads.id,
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
        createdById: adminTransport.id,
      });
      await dataSource.getRepository(Feature).save(feature);
      console.log(`  ✓ ${road.name}`);
    }

    // ========================================
    // 6. Add Features - PUBLIC TRANSPORT STOPS (Points)
    // ========================================
    console.log('\n🚌 Adding public transport stops...');

    const stops = [
      {
        name: 'Bến xe Kim Mã',
        type: 'bus_station',
        routes: ['01', '02', '09', '18'],
        coordinates: [105.8134, 21.0278],
      },
      {
        name: 'Ga Hà Nội',
        type: 'train_station',
        routes: ['metro_line_2', 'bus_01', 'bus_09'],
        coordinates: [105.8423, 21.0245],
      },
      {
        name: 'Trạm Metro Cát Linh',
        type: 'metro_station',
        routes: ['metro_line_2a'],
        coordinates: [105.8234, 21.0334],
      },
      {
        name: 'Bến xe Mỹ Đình',
        type: 'bus_station',
        routes: ['07', '08', '14', '23', '28'],
        coordinates: [105.7767, 21.0289],
      },
      {
        name: 'Điểm dừng Hồ Hoàn Kiếm',
        type: 'bus_stop',
        routes: ['09', '14', '36'],
        coordinates: [105.8521, 21.0285],
      },
      {
        name: 'Trạm Metro Nhổn',
        type: 'metro_station',
        routes: ['metro_line_3'],
        coordinates: [105.7567, 21.0456],
      },
      {
        name: 'Bến xe Gia Lâm',
        type: 'bus_station',
        routes: ['03', '06', '17', '25'],
        coordinates: [105.9301, 21.0412],
      },
      {
        name: 'Điểm dừng Lăng Bác',
        type: 'bus_stop',
        routes: ['09', '22', '33'],
        coordinates: [105.8345, 21.0367],
      },
    ];

    for (const stop of stops) {
      const feature = dataSource.getRepository(Feature).create({
        datasetId: datasetStops.id,
        branchId: mainBranchStops.id,
        geometry: {
          type: 'Point',
          coordinates: stop.coordinates,
        },
        properties: {
          name: stop.name,
          type: stop.type,
          routes: stop.routes,
          facilities: ['shelter', 'seating', 'schedule_display'],
          accessible: true,
        },
        status: FeatureStatus.ACTIVE,
        version: 1,
        createdById: adminTransport.id,
      });
      await dataSource.getRepository(Feature).save(feature);
      console.log(`  ✓ ${stop.name}`);
    }

    // ========================================
    // 7. Add Features - PARKS (Polygons)
    // ========================================
    console.log('\n🌳 Adding parks and green spaces...');

    const parks = [
      {
        name: 'Hồ Hoàn Kiếm',
        type: 'lake_park',
        area: 120000, // square meters
        coordinates: [
          [
            [105.8521, 21.0285],
            [105.8534, 21.0295],
            [105.8545, 21.0285],
            [105.8534, 21.0275],
            [105.8521, 21.0285], // Closing point
          ],
        ],
      },
      {
        name: 'Công viên Thống Nhất',
        type: 'public_park',
        area: 500000,
        coordinates: [
          [
            [105.8389, 21.0189],
            [105.8445, 21.0212],
            [105.8467, 21.0178],
            [105.8423, 21.0156],
            [105.8389, 21.0189],
          ],
        ],
      },
      {
        name: 'Hồ Tây',
        type: 'lake',
        area: 5000000,
        coordinates: [
          [
            [105.8234, 21.0456],
            [105.8334, 21.0512],
            [105.8389, 21.0489],
            [105.8378, 21.0412],
            [105.8289, 21.0389],
            [105.8234, 21.0456],
          ],
        ],
      },
      {
        name: 'Công viên Cầu Giấy',
        type: 'public_park',
        area: 350000,
        coordinates: [
          [
            [105.7901, 21.0334],
            [105.7945, 21.0356],
            [105.7967, 21.0323],
            [105.7923, 21.0301],
            [105.7901, 21.0334],
          ],
        ],
      },
      {
        name: 'Vườn hoa Con Cóc',
        type: 'flower_garden',
        area: 15000,
        coordinates: [
          [
            [105.8267, 21.0245],
            [105.8289, 21.0256],
            [105.8301, 21.0234],
            [105.8278, 21.0223],
            [105.8267, 21.0245],
          ],
        ],
      },
    ];

    for (const park of parks) {
      const feature = dataSource.getRepository(Feature).create({
        datasetId: datasetParks.id,
        branchId: mainBranchParks.id,
        geometry: {
          type: 'Polygon',
          coordinates: park.coordinates,
        },
        properties: {
          name: park.name,
          type: park.type,
          area: park.area,
          facilities: ['benches', 'walking_paths', 'lighting'],
          openingHours: '05:00-22:00',
          managed_by: 'Hanoi Parks Department',
        },
        status: FeatureStatus.ACTIVE,
        version: 1,
        createdById: adminUrban.id,
      });
      await dataSource.getRepository(Feature).save(feature);
      console.log(
        `  ✓ ${park.name} (${(park.area / 10000).toFixed(1)} hectares)`,
      );
    }

    // ========================================
    // 8. Create Working Branches (Examples)
    // ========================================
    console.log('\n🔀 Creating working branches...');

    const workingBranch1 = dataSource.getRepository(Branch).create({
      name: 'feature/add-new-metro-stations',
      isMain: false,
      datasetId: datasetStops.id,
      createdById: member1Transport.id,
      branchedFrom: mainBranchStops.id,
      status: BranchStatus.ACTIVE,
    });
    await dataSource.getRepository(Branch).save(workingBranch1);
    console.log(`  ✓ ${workingBranch1.name}`);

    const workingBranch2 = dataSource.getRepository(Branch).create({
      name: 'fix/update-road-speed-limits',
      isMain: false,
      datasetId: datasetRoads.id,
      createdById: member2Transport.id,
      branchedFrom: mainBranchRoads.id,
      status: BranchStatus.ACTIVE,
    });
    await dataSource.getRepository(Branch).save(workingBranch2);
    console.log(`  ✓ ${workingBranch2.name}`);

    // ========================================
    // Summary
    // ========================================
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Seed data created successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log(`  • Departments: 2`);
    console.log(`  • Users: 4 (2 admins, 2 members)`);
    console.log(`  • Datasets: 3`);
    console.log(`  • Main Branches: 3`);
    console.log(`  • Working Branches: 2`);
    console.log(`  • Road Features: ${roads.length}`);
    console.log(`  • Transport Stops: ${stops.length}`);
    console.log(`  • Parks: ${parks.length}`);
    console.log(
      `  • Total Features: ${roads.length + stops.length + parks.length}`,
    );

    console.log('\n🔐 Login Credentials:');
    console.log('\n  Transportation Admin:');
    console.log('    Email: admin.transport@email.vn');
    console.log('    Pass:  Admin123!');
    console.log('\n  Transportation Member 1:');
    console.log('    Email: member1.transport@email.vn');
    console.log('    Pass:  Member123!');
    console.log('\n  Transportation Member 2:');
    console.log('    Email: member2.transport@email.vn');
    console.log('    Pass:  Member123!');
    console.log('\n  Urban Planning Admin:');
    console.log('    Email: admin.urban@email.vn');
    console.log('    Pass:  Admin123!');

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
