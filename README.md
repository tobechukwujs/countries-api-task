# Country Currency & Exchange API

This is a RESTful API that fetches country data from external APIs, stores it in a PostgreSQL database, provides CRUD operations, and generates a dynamic summary image.

This project is built with **Node.js**, **Express**, and **Prisma**.

## 🚀 Features

* Fetches country data from `restcountries.com`.
* Fetches exchange rates from `open.er-api.com`.
* Stores and caches data in a PostgreSQL database.
* Calculates an estimated GDP for each country.
* Generates a dynamic summary image (`/countries/image`) of key stats.
* Provides endpoints to get, list, and delete countries.

## 🛠️ Setup and Installation

Follow these steps to run the project locally.

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd <project-folder>
```

### 2. Install Dependencies

Install all the necessary npm packages.

```bash
npm install
```

### 3. Set Up Environment Variables

1.  Create a `.env` file in the root of the project. You can copy the example file:
    ```bash
    cp .env.example .env
    ```
2.  Open the `.env` file and fill in your PostgreSQL database credentials.

    **Example `.env`:**
    ```
    # Server Configuration
    PORT=8080
    
    # Database URL (PostgreSQL)
    # Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
    DATABASE_URL="postgresql://postgres:your_password@localhost:5432/countries.db"
    
    # External API URLs
    COUNTRIES_API_URL="[https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies](https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies)"
    EXCHANGE_RATE_API_URL="[https://open.er-api.com/v6/latest/USD](https://open.er-api.com/v6/latest/USD)"
    ```

### 4. Set Up the Database

1.  Make sure your PostgreSQL server is running.
2.  Using a tool like **PgAdmin**, create a new, blank database. The name should match the database name in your `DATABASE_URL` (e.g., `countries.db`).
3.  Run the Prisma migration command in your terminal to create all the tables:

    ```bash
    npx prisma migrate dev
    ```
    (When prompted, you can name the migration "init")

### 5. Run the Application

You can now start the server in development mode (which will auto-restart on file changes).

```bash
npm run dev
```

The server will be running on `http://localhost:8080`.

## 📚 API Documentation

**Important:** The first endpoint you **must** call after starting the server is `POST /countries/refresh` to populate the database.

---

### `POST /countries/refresh`

Fetches data from external APIs, updates the database, and generates the summary image.

* **Success Response (200):**
    ```json
    {
      "message": "Data refreshed successfully"
    }
    ```
* **Error Response (503):** (If external APIs fail)
    ```json
    {
      "error": "External data source unavailable",
      "details": "Could not fetch data from one or more external APIs"
    }
