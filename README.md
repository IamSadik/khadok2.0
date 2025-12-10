# 🍽️ Khadok – Smart Food Delivery, Pickup & Dine-In Platform

**Khadok** is a full-featured food ordering platform built for the Bangladesh market. It connects **Consumers**, **Stakeholders** (restaurant owners), **Riders**, and **Admins** in one ecosystem, offering delivery, pickup, and immersive dine-in experiences. Key differentiators include real-time logistics, 3D interior previews, AI recommendations, and multi-role dashboards.

---

## 🚀 Project Description

Khadok streamlines every step of the ordering journey:

1. **Consumers** browse nearby restaurants on an interactive map, place orders for delivery or pickup, book dine-in tables, and view 3D restaurant interiors before arriving.
2. **Stakeholders** manage menus, pricing, table inventory, upload 360° interior tours, and monitor incoming orders in real time.
3. **Riders** receive optimized delivery assignments, track their route, update deliveries via mobile, and view their performance dashboard.
4. **Admins** oversee the entire system: user management, session auditing, analytics, and compliance.

---

## 🔥 Key Features (Detailed)

### 1. Map-Based Discovery & Routing
- **MapTiler + Leaflet.js**  
  - Custom-styled tiled maps for desktop & mobile.  
  - Consumer location auto-detected; restaurants clustered by proximity.  
- **OSRM Integration**  
  - Computes real-world driving routes and ETAs.  
  - Isochrone zones (“restaurants within 10 mins”) drawn dynamically.  
- **Geofencing**  
  - Defines restaurant pickup zones.  
  - Triggers “order ready” notifications when rider enters geofence.

### 2. Real-Time Order Flow
- **Socket.io**  
  - Live order-status updates (e.g. “Preparing → En Route → Delivered”).  
  - Two-way chat channel between consumer & rider.
- **Browser Push Notifications**  
  - Service Workers deliver status alerts even when the user’s tab is closed.
- **SMS Alerts via bKash API**  
  - Consumers opt-in to receive SMS confirmations and delivery arrival messages.

### 3. 3D Interior Previews
- **Panolens.js**  
  - Embed 360° panoramic tours of restaurant interiors.  
  - Allows consumers to virtually “look around” before booking tables.
- **Three.js**  
  - Renders interactive 3D models of table layouts.  
  - Consumers can select specific tables during booking.

### 4. Payments & Invoicing
- **bKash Checkout Integration**  
  - Secure mobile-wallet payments within the browser.  
  - Webhook support for payment confirmation & transaction logging.
- **PDFKit**  
  - On-the-fly generation of PDF receipts.  
  - Automated emailing of invoices via SMTP (e.g. SendGrid).

### 5. AI-Driven Recommendations & Search
- **Full-Text Search (MySQL InnoDB + Hit-Highlighting)**  
  - Fast search across restaurant names, menu items, and reviews.  
  - Autocomplete suggestions as you type.
- **Cache Layer (Redis)**  
  - Caches popular search queries and top-selling menus to minimize DB load.

### 6. Role-Based Dashboards & Analytics
- **Consumers**  
  - Order history, favorite restaurants, saved payment methods.  
- **Stakeholders**  
  - Live sales dashboard: orders per hour, busiest menu items, table occupancy heatmap.  
- **Riders**  
  - Delivery performance metrics: average time, distance covered, on-time rate.  
- **Admins**  
  - System-wide KPIs: active sessions, revenue trends, user growth.  
  - Session management: per-session logout, session expiry controls.

### 7. Security & Compliance
- **MySQL with TLS** for encrypted in-transit data.  
- **bcrypt** for password hashing.  
- **Helmet.js + CSP headers** to mitigate XSS, clickjacking, and other attacks.  
- **Session Management**  
  - Per-session tracking stored in MySQL sessions table.  
  - Individual-session logout endpoint for greater security.  

---

## 🛠️ Tech Stack

| Layer         | Technology                                       |
|---------------|--------------------------------------------------|
| **Frontend**  | HTML5, CSS3, Vanilla JavaScript                  |
| **Mapping**   | MapTiler (tiles), Leaflet.js, OSRM routing       |
| **3D Tours**  | Panolens.js, Three.js                            |
| **Backend**   | Node.js, Express.js                              |
| **Real-Time** | Socket.io                                        |
| **Payments**  | bKash API                                        |
| **Database**  | MySQL (primary), Redis (cache)                   |
| **Authentication** | express-session                             |
| **File Uploads**  | Multer                                       |
| **Environment**   | dotenv                                       |
| **PDF Generation**| PDFKit                                       |
| **Email**         | SendGrid / SMTP                              |

---

## 📦 Installation & Setup
1. **Clone the repository**  
   ```bash
   git clone https://github.com/IamSadik/khadok-2.0.git
    ```
2. **Navigate to the project directory**  
   ```bash
   cd khadok-2.0
    ```
3. **Install dependencies**
    ```bash     
   npm install
    ```
4. **Set up environment variables**  
   Create a `.env` file in the root directory and add the following variables:
    ```env
    PORT=3000
    HOST=your_database_host
    USER=your_database_user
    PASSWORD=your_database_password
    DB_PORT=your_database_port
    DATABASE=your_database_name
    SESSION_SECRET=your_session_secret
    SESSION_NAME=your_session_name
    SESSION_LIFETIME=your_session_lifetime_in_ms
    BKASH_API_KEY=your_bkash_api_key
    SENDGRID_API_KEY=your_sendgrid_api_key
    MAPTILER_API_KEY=your_maptiler_api_key
    ```
5. **Start the development server** 
   ```bash  
   npm start
   ```

