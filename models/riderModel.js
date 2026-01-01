const db = require('../config/configdb');

// Generate unique ID for rider
const getUniqueRiderId = async () => {
    const query = 'SELECT rider_id FROM rider ORDER BY rider_id DESC LIMIT 1';
    return new Promise((resolve, reject) => {
        db.query(query, [], (err, results) => {
            if (err) return reject(err);
            const lastId = results.length > 0 ? parseInt(results[0].rider_id, 10) : -1;
            resolve(lastId + 1);
        });
    });
};

// Create a new rider
const createRider = async (riderId, name, email, hashedPassword) => {
    const query = 'INSERT INTO rider (rider_id, name, email, password, lat, lng) VALUES (?, ?, ?, ?, "", "")';
    return new Promise((resolve, reject) => {
        db.query(query, [riderId, name, email, hashedPassword], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// Get rider by ID
const getRiderById = (riderId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM rider WHERE rider_id = ?';
        db.query(query, [riderId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]);
        });
    });
};

// Get rider by email
const getRiderByEmail = (email) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM rider WHERE email = ?';
        db.query(query, [email], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]);
        });
    });
};

// Update rider profile
const updateRiderProfile = (riderId, updates) => {
    return new Promise((resolve, reject) => {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updates)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        
        values.push(riderId);
        const query = `UPDATE rider SET ${fields.join(', ')}, updated_at = NOW() WHERE rider_id = ?`;
        
        db.query(query, values, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// Update rider status
const updateRiderStatus = (riderId, status) => {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE rider SET status = ?, updated_at = NOW() WHERE rider_id = ?';
        db.query(query, [status, riderId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// Update rider location
const updateRiderLocation = (riderId, lat, lng) => {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE rider SET current_lat = ?, current_lng = ?, last_location_update = NOW() WHERE rider_id = ?';
        db.query(query, [lat, lng, riderId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// Get available riders near location
const getAvailableRidersNearLocation = (lat, lng, radiusKm = 5) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT *, 
            (6371 * acos(cos(radians(?)) * cos(radians(CAST(current_lat AS DECIMAL(10,6)))) * 
            cos(radians(CAST(current_lng AS DECIMAL(10,6))) - radians(?)) + 
            sin(radians(?)) * sin(radians(CAST(current_lat AS DECIMAL(10,6)))))) AS distance
            FROM rider 
            WHERE status = 'available' 
            AND is_active = 1 
            AND is_verified = 1
            AND current_lat IS NOT NULL 
            AND current_lng IS NOT NULL
            HAVING distance < ?
            ORDER BY distance ASC
        `;
        db.query(query, [lat, lng, lat, radiusKm], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// Get rider statistics
const getRiderStats = (riderId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                total_deliveries,
                successful_deliveries,
                cancelled_deliveries,
                average_delivery_time,
                rating,
                total_ratings
            FROM rider 
            WHERE rider_id = ?
        `;
        db.query(query, [riderId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]);
        });
    });
};

// Update delivery statistics
const updateDeliveryStats = (riderId, deliveryTime, wasSuccessful) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE rider 
            SET 
                total_deliveries = total_deliveries + 1,
                successful_deliveries = successful_deliveries + ${wasSuccessful ? 1 : 0},
                cancelled_deliveries = cancelled_deliveries + ${wasSuccessful ? 0 : 1},
                average_delivery_time = (
                    (COALESCE(average_delivery_time, 0) * total_deliveries + ?) / (total_deliveries + 1)
                )
            WHERE rider_id = ?
        `;
        db.query(query, [deliveryTime || 0, riderId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// Add rating to rider
const addRiderRating = (riderId, rating) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE rider 
            SET 
                total_ratings = total_ratings + 1,
                rating = (
                    (COALESCE(rating, 0) * total_ratings + ?) / (total_ratings + 1)
                )
            WHERE rider_id = ?
        `;
        db.query(query, [rating, riderId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

module.exports = {
    getUniqueRiderId,
    createRider,
    getRiderById,
    getRiderByEmail,
    updateRiderProfile,
    updateRiderStatus,
    updateRiderLocation,
    getAvailableRidersNearLocation,
    getRiderStats,
    updateDeliveryStats,
    addRiderRating
};
