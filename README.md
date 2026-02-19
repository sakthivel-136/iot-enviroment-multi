# Dashboard Overview

## Deployment Instructions

### 1. Backend Setup

The backend uses FastAPI and handles data fetching from ThingSpeak, running predictions, and storing data in Supabase.

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create a virtual environment:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Set up environment variables:
    -   Edit `.env` file and verify Supabase credentials and `THINGSPEAK_CHANNEL_ID` (3221984).

5.  Run the server:
    ```bash
    uvicorn app.main:app --reload
    ```
    The backend will start polling every 3 minutes. You can also manually trigger an update via `POST /api/trigger-update`.

### 2. Frontend Setup

The frontend is a Next.js application showing real-time stats.

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000).

### 3. Database Setup

Run the SQL script `backend/schema.sql` in your Supabase SQL Editor to create the necessary tables.

## System Architecture

-   **Zones**: A (Kitchen), B (Living Room), C (Bedroom)
-   **Model**: Single Random Forest model (`rf_model.pkl`) used for all zones.
-   **Data Flow**: ThingSpeak (Fields 1-12) -> FastAPI -> Supabase -> Next.js

## Folder Structure

```
MultiZoneEnvMonitor/
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI entry point
│   │   ├── tasks.py       # Scheduler & Prediction logic
│   │   ├── database.py    # Supabase connection
│   │   └── config.py      # Config loader
│   ├── model/
│   │   ├── train_model.py # Script to train model
│   │   └── rf_model.pkl   # Trained model file
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx       # Main dashboard
│   │   ├── globals.css    # Styling
│   │   └── zone/[id]/     # Zone detail page
│   └── components/
│       ├── ZoneCard.tsx
│       └── EnvironmentMap.tsx
└── README.md
```
