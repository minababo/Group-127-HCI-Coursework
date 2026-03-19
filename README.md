# FurnitureViz

FurnitureViz is a frontend-only room-planning prototype developed for the **PUSL3122 HCI, Computer Graphics and Visualisation** coursework.

The application allows users to create room layouts in a **2D workspace** and inspect the result in a **3D preview**. It was designed as a functional prototype focused on **interaction design, usability, and visualisation**.

## Features

- **Login with two roles:**
  - **Admin** – creates and manages master room templates.
  - **User** – browses templates, creates personal designs, and edits only their own saved work.
- **Dashboard** with design statistics and navigation.
- **Room creation** with custom shapes, dimensions, measurement units, and wall colors.
- **2D room editor** featuring drag-and-drop placement, resizing, rotation, snapping, and collision/boundary constraints.
- **Saved designs page** with role-based actions and delete confirmation.
- **3D preview** using Three.js for high-fidelity spatial inspection.
- **LocalStorage persistence** for sessions and design data.

## Technology Stack

- **React + Vite**
- **Plain CSS**
- **Three.js**
- **LocalStorage**

## Project Structure

    frontend/
      public/
        images/
        models/
      src/
        components/
        utils/
        assets/
        styles/

### Main Components & Logic

- **LoginPage.jsx** - login flow and authentication UI
- **DashboardPage.jsx** - dashboard and saved-designs interface
- **CreateRoomPage.jsx** - room setup and validation
- **RoomDesignerPage.jsx** - 2D editor and interaction logic
- **Preview3DPage.jsx** - 3D preview using Three.js
- **designStorage.js** - LocalStorage persistence
- **account.js** - account roles and session persistence
- **itemValidation.js** - snapping, collision, and boundary validation
- **roomShape.js** - room shape logic and geometry
- **roomShape.js** - 3D preview data preparation

## How to Run

1. Navigate to the frontend directory:
   `cd frontend`

2. Install dependencies:
   `npm install`

3. Start the development server:
   `npm run dev`

4. Open the local URL shown in your terminal (usually `http://localhost:5173`).

## Demo Accounts

| Role      | Username/Email | Password   |
| :-------- | :------------- | :--------- |
| **Admin** | `admin`        | `admin123` |
| **User**  | `user`         | `user123`  |

## Coursework Notes

- This is a **frontend-only prototype**. No backend or external database is used.
- Persistence is handled strictly through **browser LocalStorage**.
- The 3D view is intended for **visual inspection** and spatial feedback, not full 3D editing.

## Group 127

- 10952558 - Minada Amarasinghe
- 10952556 - Damithu Samarasinha
- 10953037 - Simeshaa Barskaran
- 10952751 - Edirisinghe Ekanayake
- 10952712 - Bejunge Warnakulasooriya
- 10952976 - Gamage Munasinghe
