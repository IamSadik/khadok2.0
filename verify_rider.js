const db = require('./config/configdb');

console.log('🔧 Verifying rider account...\n');

// Update rider to be verified
db.query(
  `UPDATE rider 
   SET is_verified = 1, 
       is_active = 1,
       status = 'available'
   WHERE rider_id = 39`,
  (err, result) => {
    if (err) {
      console.error('❌ Error verifying rider:', err);
      process.exit(1);
    }
    
    console.log('✅ Rider verified successfully!');
    console.log(`   - is_verified: 1 (verified)`);
    console.log(`   - is_active: 1 (active)`);
    console.log(`   - status: available`);
    
    // Check the result
    db.query('SELECT * FROM rider WHERE rider_id = 39', (err, riders) => {
      if (err) {
        console.error('Error fetching rider:', err);
        db.end();
        return;
      }
      
      console.log('\n📋 Rider Details:');
      console.log(`   Name: ${riders[0].name}`);
      console.log(`   Email: ${riders[0].email}`);
      console.log(`   Phone: ${riders[0].number}`);
      console.log(`   Status: ${riders[0].status}`);
      console.log(`   Is Active: ${riders[0].is_active ? 'Yes' : 'No'}`);
      console.log(`   Is Verified: ${riders[0].is_verified ? 'Yes' : 'No'}`);
      console.log(`   Vehicle: ${riders[0].vehicle_type}`);
      
      console.log('\n✅ Rider is now ready to receive orders!');
      console.log('\n💡 Next steps:');
      console.log('   1. Make sure the rider app is running');
      console.log('   2. Rider should be logged in');
      console.log('   3. Place a test order from consumer app');
      console.log('   4. Order should now be assigned automatically\n');
      
      db.end();
    });
  }
);
