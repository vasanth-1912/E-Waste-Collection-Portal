# 🌱 EcoCycle – E-Waste Collection Portal (Full-Stack Mini Project)

A modern, responsive, and eco-friendly E-Waste Collection & Recycling Management Portal built with **HTML5, CSS3, Vanilla JavaScript, and a Node.js REST API Backend**.

---

## 🚀 Key Features

### 1. Frontend Portal (`index.html`)
- **Navigation Bar**: Responsive with mobile hamburger drawer menu, active section highlighting, and live request counter badge.
- **Hero Section**: Catchy environmental slogan, interactive CTA buttons, and animated statistical counters (`500+` Collected, `200+` Users, `100%` Eco-friendly).
- **About Section**: Detailed e-waste recycling lifecycle overview with three core impact cards (*Reduce Pollution*, *Reuse Resources*, *Protect Nature*).
- **E-Waste Categories**: 6 interactive cards (*Mobile Phones, Laptops, Keyboards & Mouse, Batteries & Chargers, Televisions, Other Electronics*). Clicking **Select** automatically selects the category in the form and scrolls with an animated highlight pulse.
- **How It Works**: 3-step intuitive recycling process.
- **Doorstep Pickup Form**: Real-time validation, past-date prevention, and automatic generation of unique Request IDs (`ECO-XXXXX`).
- **Contact Section**: Inquiries form connected to backend.
- **Modals**: Pickup Confirmation Modal and Saved Requests / Database inspector modal.

### 2. Full-Stack Node.js Backend (`server.js`)
- **Zero External Dependencies**: Built with native Node.js core modules (`http`, `fs`, `path`, `url`).
- **Persistent JSON Database**: Auto-stored in `data/pickups.json` and `data/contacts.json`.
- **RESTful Endpoints**:
  - `GET /api/status` – Server health & uptime
  - `GET /api/stats` – Dynamic recycling metrics
  - `GET /api/pickups` – Query & filter pickup requests
  - `POST /api/pickups` – Server-side validation & record creation
  - `PATCH /api/pickups/:id/status` – Update pickup status (`Scheduled` $\rightarrow$ `In Transit` $\rightarrow$ `Recycled`)
  - `DELETE /api/pickups/:id` – Remove pickup from database
  - `GET /api/contacts` – View contact inquiries
  - `POST /api/contact` – Submit contact message

### 3. Admin & Evaluator Dashboard (`admin.html`)
- Live dashboard for teachers and evaluators to inspect database records in real-time.
- Status management dropdowns to transition requests between *Scheduled*, *In Transit*, and *Recycled*.
- Real-time search and category/status filtering.

---

## 💻 How to Run the Project

### Prerequisites
- [Node.js](https://nodejs.org/) installed (v16 or higher).

### Steps:
1. Open a terminal in the project directory:
   ```bash
   cd "c:\Users\TUF\Desktop\mini project"
   ```
2. Start the Node.js backend server:
   ```bash
   node server.js
   ```
3. Open your browser and navigate to:
   - **User Portal**: [http://localhost:8080](http://localhost:8080)
   - **Admin Dashboard**: [http://localhost:8080/admin.html](http://localhost:8080/admin.html)
   - **REST API Endpoint**: [http://localhost:8080/api/stats](http://localhost:8080/api/stats)

---

## 📁 Project File Structure

```
mini project/
├── data/
│   ├── pickups.json       # JSON database for pickup records
│   └── contacts.json      # JSON database for contact messages
├── index.html             # Main EcoCycle Portal UI
├── admin.html             # Admin & Evaluator Dashboard
├── style.css              # Custom eco-friendly design system
├── script.js              # Client-side validation & API integration
├── server.js              # Node.js REST API server
├── package.json           # Node project configuration
└── README.md              # Project documentation
```

---

## 🎓 College Presentation Tips
1. **Show User Booking**: Submit a pickup request on the home page and observe the generated `ECO-XXXXX` Request ID in the success modal.
2. **Show Database Persistence**: Open [http://localhost:8080/admin.html](http://localhost:8080/admin.html) or `data/pickups.json` to show that the record is permanently saved on the server.
3. **Show Status Transition**: In the Admin Dashboard, change the status from `Scheduled` to `Recycled` and demonstrate the `PATCH` REST API call.
