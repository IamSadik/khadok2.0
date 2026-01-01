const db = require('./config/configdb');

console.log('🔍 Checking database schema for delivery system...\n');

// Check if orders table has delivery columns
db.query('DESCRIBE orders', (err, results) => {
  if (err) {
    console.error('❌ Error checking orders table:', err);
    process.exit(1);
  }
  
  console.log('📋 Orders Table Columns:');
  const columns = results.map(r => r.Field);
  
  const requiredColumns = [
    'rider_id',
    'delivery_status',
    'delivery_lat',
    'delivery_lng',
    'restaurant_lat',
    'restaurant_lng',
    'estimated_delivery_time',
    'rider_assigned_at',
    'picked_up_at',
    'delivered_at'
  ];
  
  requiredColumns.forEach(col => {
    if (columns.includes(col)) {
      console.log(`  ✅ ${col} - EXISTS`);
    } else {
      console.log(`  ❌ ${col} - MISSING`);
    }
  });
  
  // Check rider table
  db.query('DESCRIBE rider', (err, results) => {
    if (err) {
      console.error('❌ Error checking rider table:', err);
      process.exit(1);
    }
    
    console.log('\n📋 Rider Table Columns:');
    const riderColumns = results.map(r => r.Field);
    
    const requiredRiderColumns = [
      'status',
      'current_lat',
      'current_lng',
      'total_deliveries',
      'rating',
      'is_active',
      'is_verified',
      'vehicle_type'
    ];
    
    requiredRiderColumns.forEach(col => {
      if (riderColumns.includes(col)) {
        console.log(`  ✅ ${col} - EXISTS`);
      } else {
        console.log(`  ❌ ${col} - MISSING`);
      }
    });
    
    // Check for delivery_tracking table
    db.query('SHOW TABLES LIKE "delivery_tracking"', (err, results) => {
      if (err) {
        console.error('❌ Error checking delivery_tracking table:', err);
        process.exit(1);
      }
      
      console.log('\n📋 Delivery Tracking Table:');
      if (results.length > 0) {
        console.log('  ✅ delivery_tracking - EXISTS');
      } else {
        console.log('  ❌ delivery_tracking - MISSING');
      }
      
      // Check for available riders
      db.query(`SELECT COUNT(*) as count FROM rider WHERE status = 'available' AND is_active = 1 AND is_verified = 1`, (err, results) => {
        if (err) {
          console.log('\n⚠️  Cannot check rider availability (status column may not exist)');
        } else {
          console.log('\n📋 Available Riders:');
          console.log(`  ${results[0].count} riders are currently available`);
        }
        
        // Check restaurant coordinates
        db.query('SELECT stakeholder_id, restaurant_name, lat, lng FROM stakeholder LIMIT 5', (err, results) => {
          if (err) {
            console.error('❌ Error checking restaurant coordinates:', err);
          } else {
            console.log('\n📋 Sample Restaurant Coordinates:');
            results.forEach(r => {
              if (r.lat && r.lng) {
                console.log(`  ✅ ${r.restaurant_name}: (${r.lat}, ${r.lng})`);
              } else {
                console.log(`  ❌ ${r.restaurant_name}: NO COORDINATES`);
              }
            });
          }
          
          console.log('\n' + '='.repeat(60));
          console.log('🎯 DIAGNOSIS COMPLETE');
          console.log('='.repeat(60));
          console.log('\nIf you see MISSING columns above, you need to run:');
          console.log('  migrations/delivery_system_upgrade.sql');
          console.log('\nIn phpMyAdmin or MySQL:');
          console.log('  1. Select your khadok2_0 database');
          console.log('  2. Go to SQL tab');
          console.log('  3. Copy and paste the entire delivery_system_upgrade.sql file');
          console.log('  4. Click "Go" to execute');
          
          db.end();
        });
      });
    });
  });
});
