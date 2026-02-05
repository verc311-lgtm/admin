# Guía de Despliegue en Hostinger

Sigue estos pasos para subir tu aplicación "CoastalVA Marine" a Hostinger.

## 1. Base de Datos (MySQL)

1.  Entra a tu **hPanel** (Panel de Control de Hostinger).
2.  Ve a **Base de Datos** -> **Gestión de Bases de Datos**.
3.  Crea una nueva base de datos MySQL (anota el nombre de la BD, el usuario y la contraseña).
4.  Entra en **phpMyAdmin** para esa base de datos.
5.  Selecciona la base de datos a la izquierda.
6.  Ve a la pestañ **Importar**.
7.  Selecciona el archivo `hostinger_deploy/database/db_setup.sql` y dale a "Importar".

## 2. Configuración de Conexión

1.  Abre el archivo `hostinger_deploy/public_html/db_connect.php` con un editor de texto (Notepad, VS Code, etc.).
2.  Edita las líneas con tus credenciales reales que creaste en el paso 1:
    ```php
    $db_config = [
        'host' => 'localhost',         
        'dbname' => 'u123456789_nombre_real',  // <-- Tu nombre de BD real
        'user' => 'u123456789_usuario_real',   // <-- Tu usuario real
        'pass' => 'tu_contraseña_real',        // <-- Tu contraseña real
        'charset' => 'utf8mb4'
    ];
    ```
3.  Guarda el archivo.

## 3. Subir Archivos

1.  Ve al **Administrador de Archivos** en tu hPanel (dentro de la sección Archivos).
2.  Entra en la carpeta `public_html`.
3.  **Borra** cualquier archivo que haya ahí (como `default.php` o `index.php` viejos).
4.  Sube **TODO** el contenido de la carpeta `hostinger_deploy/public_html/`.
    *   Truco: Puedes seleccionar todos los archivos dentro de `hostinger_deploy/public_html` en tu PC, comprimirlos en un zip (`upload.zip`), subir ese zip y luego "Extract" (Descomprimir) en el administrador de archivos de Hostinger.

## 4. Verificar

1.  Visita tu dominio (ej. `www.tudominio.com`).
2.  ¡Debería cargar la aplicación!
3.  Si ves un error de "Error de conexión a la base de datos", revisa el archivo `db_connect.php` en el servidor y asegúrate de que la contraseña y usuario sean correctos.

## Notas Técnicas

*   El archivo `.htaccess` incluido está configurado para manejar las rutas de React, así que si recargas la página en una ruta interna, no dará error 404.
*   La API se encuentra en `/api.php`.
