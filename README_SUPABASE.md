# Supabase Connection Guide

Your project is now connected to Supabase (PostgreSQL)!

## 1. Important: Enable PostgreSQL in XAMPP
Since Supabase uses PostgreSQL, you must enable the PHP extension in XAMPP.

1.  Open **XAMPP Control Panel**.
2.  Click **Config** next to Apache -> **PHP (php.ini)**.
3.  Search for these lines and remove the `;` at the start to uncomment them:
    ```ini
    extension=pdo_pgsql
    extension=pgsql
    ```
    *(If you don't find them, add them at the end of the file).*
4.  **Restart Apache** in XAMPP.

## 2. Running the App
1.  **Start Apache** in XAMPP (this serves `api.php`).
2.  **Start Frontend**:
    ```bash
    npm run dev
    ```
3.  Open the app in your browser.

## 3. Syncing Data
I have added a **"Sync to Cloud"** button in the **User Management** section.
- Go to **User Management**.
- Click **Sync to Cloud**.
- This will send your local data (localStorage) to the Supabase database.

## Troubleshooting
- If "Sync Failed" says "could not find driver", you missed Step 1 (Enabling PHP extensions).
- If "Sync Failed" says "Connection refused", check if your `.env` password is correct.
