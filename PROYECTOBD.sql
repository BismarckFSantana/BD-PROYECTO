CREATE DATABASE PROYECTO;

GO





USE PROYECTO;

GO



CREATE TABLE PROVEEDOR

(

    ID_PROVEEDOR INT IDENTITY(1,1) NOT NULL,

    NOMBRE_PROVEEDOR NVARCHAR(100) NOT NULL UNIQUE ,

    TELEFONO_PROVEEDOR NVARCHAR(20) NOT NULL UNIQUE ,

    CORREO_PROVEEDOR NVARCHAR(100) NOT NULL UNIQUE,

    DIRECCION NVARCHAR(500) NOT NULL,

    PAGO_ENVIO DECIMAL (5,2) NOT NULL,

	CANTIDAD_PRODUCTO INT NOT NULL,

    CONSTRAINT PK_PROVEEDOR PRIMARY KEY CLUSTERED (ID_PROVEEDOR ASC),

    CONSTRAINT CK_PROVEEDOR_TELEFONO_PROVEEDOR CHECK (LEN(TELEFONO_PROVEEDOR) >= 8 ),

    CONSTRAINT CK_PROVEEDOR_NOMBRE_PROVEEDOR CHECK (NOMBRE_PROVEEDOR NOT LIKE '%[^A-ZA-ZÁÉÍÓÚÁÉÍÓÚÑÑ ]%'),

    CONSTRAINT CK_PROVEEDOR_CORREO CHECK (CORREO_PROVEEDOR LIKE '%_@_%._%')

    

);

GO





CREATE TABLE almacen

(

    id_almacen INT IDENTITY(100,1) NOT NULL,

    fecha_ingreso DATE NOT NULL,

    producto_dañado INT NOT NULL DEFAULT 0,

    id_proveedor INT NOT NULL,

    CONSTRAINT PK_almacen PRIMARY KEY CLUSTERED (id_almacen ASC),

    CONSTRAINT FK_almacen_PROVEEDOR FOREIGN KEY (id_proveedor) REFERENCES PROVEEDOR (id_proveedor),

    CONSTRAINT CK_almacen_producto_dañado CHECK (producto_dañado >= 0)

);

GO

CREATE TABLE repartidor

(

    id_repartidor INT IDENTITY(1,1) NOT NULL,

    nombre_repartidor nvarchar(100) NOT NULL,

    celular_repartidor nvarchar(20) NOT NULL UNIQUE,

    CONSTRAINT PK_repartidor PRIMARY KEY CLUSTERED (id_repartidor ASC),

    CONSTRAINT CK_celular_repartidor_repartidor CHECK (LEN(celular_repartidor) >= 8 AND celular_repartidor NOT LIKE '%[^0-9]%'),

    CONSTRAINT CK_repartidor_nombre_repartidor CHECK (nombre_repartidor NOT LIKE '%[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]%')

);
GO

CREATE TABLE producto

(

    id_producto INT IDENTITY(1,1),

    id_repartidor INT NOT NULL,

	id_proveedor INT NOT NULL,

    nombre_producto nvarchar(50) NOT NULL,

    descripcion nvarchar(100) NOT NULL,

    color nvarchar(20) NOT NULL,

    estilo nvarchar (30) NOT NULL,

    categoria char (1) NOT NULL,

    marca nvarchar(35) NOT NULL,

	 ruta_imagen NVARCHAR(255) NOT NULL,

    CONSTRAINT PK_producto PRIMARY KEY CLUSTERED (id_producto ASC),

    CONSTRAINT FK_producto_repartidor FOREIGN KEY (id_repartidor) REFERENCES repartidor (id_repartidor),

	CONSTRAINT FK_producto_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedor (id_proveedor),

    CONSTRAINT CK_producto_categoria CHECK (categoria IN ('F', 'M', 'U')),

    CONSTRAINT CK_producto_nombre_producto CHECK (nombre_producto NOT LIKE '%[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]%'),

    CONSTRAINT CK_producto_color CHECK (color NOT LIKE '%[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]%')
);
GO





CREATE TABLE variante_producto

(

    id_variante INT IDENTITY(1,1),

    talla char (10) NOT NULL,

    precioVenta DECIMAL(10,2) NOT NULL,

    stock INT NOT NULL,

    id_producto INT NOT NULL,

    CONSTRAINT PK_variante_producto PRIMARY KEY CLUSTERED (id_variante ASC),

    CONSTRAINT FK_variante_producto FOREIGN KEY (id_producto) REFERENCES producto (id_producto),

    CONSTRAINT CK_variante_producto_talla CHECK(talla IN ('XXS','XS', 'S', 'S/M', 'M' , 'M/L', 'L', 'L/XL', 'XL' , 'XL/XXL', 'XXL' , 'XXL/XXXL' , 'XXXL')),

    CONSTRAINT CK_variante_producto_stock CHECK (stock > 0)

);
GO

CREATE TABLE usuario

(

    id_usuario INT IDENTITY(1,1) NOT NULL,

    nombre_usuario nvarchar(100) NOT NULL,

    apellido_usuario nvarchar(100) NOT NULL,

    correo nvarchar(100) NOT NULL UNIQUE,

    contraseña nvarchar(250) NOT NULL ,

    numero_Celular nvarchar(20) NOT NULL UNIQUE,

    tipo_Usuario char(1) NOT NULL,

	direccion_envio nvarchar(200) NOT NULL, 

    CONSTRAINT PK_usuario PRIMARY KEY CLUSTERED (id_usuario ASC),

    CONSTRAINT CK_numero_Celular_usuario CHECK (LEN(numero_Celular) >= 8  AND numero_celular NOT LIKE '%[^0-9]%'),

    CONSTRAINT CK_usuario_nombre_usuario CHECK (nombre_usuario NOT LIKE '%[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]%'),

    CONSTRAINT CK_usuario_correo CHECK (correo LIKE '%_@_%._%'),

    CONSTRAINT CK_celular_repartidor CHECK (LEN(numero_celular) >= 8 AND numero_celular NOT LIKE '%[^0-9]%'),

    CONSTRAINT CK_usuario_tipo_Usuario CHECK (tipo_Usuario IN ('T', 'C')) --TRabajor = T y CLiente = C
);
GO

CREATE TABLE carrito

(

    id_carrito INT IDENTITY(1,1) NOT NULL,

    fecha_creacion DATE NOT NULL,

    id_usuario INT NOT NULL,

    CONSTRAINT PK_carrito PRIMARY KEY CLUSTERED (id_carrito ASC),

    CONSTRAINT FK_carrito_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)

);
GO

CREATE TABLE detalle_carrito

(

    id_carrito INT NOT NULL,

    id_variante INT NOT NULL,

    cantidad INT NOT NULL,

    CONSTRAINT PK_detalle_carrito PRIMARY KEY CLUSTERED (id_carrito, id_variante ASC),

    CONSTRAINT FK_detalle_carrito_carrito FOREIGN KEY (id_carrito) REFERENCES carrito (id_carrito),

    CONSTRAINT FK_detalle_carrito_variante_producto FOREIGN KEY (id_variante) REFERENCES variante_producto (id_variante)

);
GO

CREATE TABLE factura

(

    numero_factura INT IDENTITY(1,1) NOT NULL,

    id_carrito INT NOT NULL,

    id_variante INT NOT NULL,

    fecha_factura DATETIME2 NOT NULL,

    total_pago DECIMAL(10,2) NOT NULL,

    metodo_pago NVARCHAR(30) NOT NULL,

    tipo_envio nvarchar(30) NOT NULL,

    numero_referencia nvarchar(50) NOT NULL UNIQUE,

    precio_unitario DECIMAL(10,2) NOT NULL,

	descuento INT NOT NULL,

    cantidad INT NOT NULL,

    CONSTRAINT PK_factura PRIMARY KEY CLUSTERED (numero_factura ASC),

    CONSTRAINT FK_factura_variante_producto FOREIGN KEY (id_variante) REFERENCES variante_producto (id_variante),

    CONSTRAINT FK_detalle_carrito FOREIGN KEY (id_carrito) REFERENCES carrito (id_carrito)
);
GO

--Calculo de la factura, revisa esto Elian xd
UPDATE factura
SET total_pago = (precio_unitario * cantidad) * (1 - (descuento / 100.0))
WHERE total_pago = 0;

--obtener calculo para paginacion
SELECT 
    p.id_producto, 
    p.nombre_producto AS nombre_producto, 
    MIN(v.precioVenta) AS precio, -- O el criterio de precio que prefieras mostrar en el catálogo
    p.ruta_imagen 
FROM producto p
LEFT JOIN variante_producto v ON p.id_producto = v.id_producto
GROUP BY p.id_producto, p.nombre_producto, p.ruta_imagen
ORDER BY p.id_producto
OFFSET @PageSize * (@PageNumber - 1) ROWS
FETCH NEXT @PageSize ROWS ONLY;

--obtener la vista detallada de un producto
SELECT 
	p.id_producto,
	p.nombre_producto AS nombre_producto,
	p.descripcion,
	p. ruta_imagen,
	p.categoria,
	v.talla,
	v.stock,
	v.precioVenta AS precio
FROM producto p
LEFT JOIN variante_producto v ON p.id_producto = v.id_producto;

--buscar producto por nombre o descripcion
SELECT
	p.id_producto,
	p.nombre_producto AS nombre_producto,
	p.descripcion,
	p. ruta_imagen,
	p.categoria,
	v.talla,
	v.stock,
	v.precioVenta AS precio
FROM producto p
LEFT JOIN variante_producto v ON p.id_producto = v.id_producto
WHERE (@Criterio IS NULL OR p.nombre_producto LIKE '%' + @Criterio + '%' OR p.descripcion LIKE '%' + @Criterio + '%')
GROUP BY p.id_producto, p.nombre_producto, p.ruta_imagen
ORDER BY p.id_producto
OFFSET @PageSize * (@PageNumber - 1) ROWS
FETCH NEXT @PageSize ROWS ONLY;

--FIltrar productos por rango de precio 
SELECT
	p.id_producto AS nombre_prodcuto,
	p.nombre_producto,
	p.ruta_imagen,
	v.precioVenta AS precio
FROM producto p
LEFT JOIN variante_producto v ON p.id_producto = v.id_producto
WHERE precioVenta bETWEEN @MinPrecio AND @MaxPrecio;

--Modulo de usuarios y seguridad
--Registrar un nuevo cliente
INSERT INTO usuario (nombre_usuario, correo, contraseña, ,tipo_rol) VALUES (@Nombre, @Email,@Password, GETDATE(), 'cliente');

--Verificar credenciales
SELECT
	p.id_usuario,
	p.nombre_usuario,
	p.contraseña,
	ptipo_rol
FROM usuario 
WHERE email = @Email;

--actualizar contraseña
UPDATE usuario SET contraseña = @NuevoHash WHERE id_usuario = @idUsuario;

--Obtener datos del perfil del cliente:
SELECT nombre_usuario, correo, direccion_envio,
numero_Celular FROM usuario WHERE id_usuario = @IdUsuario;

--actualizar la direccion del perfil
UPDATE usuario SET direccion_envio = @Direccion,telefono = @Telefono WHERE id_usuario = @IdUsuario;

--Modulo carrito
--Agregar producto al carrito
INSERT INTO carrito (id_usuario, id_producto, cantidad, fecha_creacion)
VALUES (@IdUsuario, @IdProducto, @Cantidad, GETDATE());
--actualizar cantidad en el carrito
UPDATE carrio SET cantidad = @NuevaCantidad WHERE id_usuario = @Idusuario AND id_producto = @IdProducto;

--ver carrito actual
SELECT c.id_producto, p.nombre_producto, p.precioVenta, p.ruta_imagen, c.cantidad, (p.precio * c.cantidad) AS subtotal
FROM carrito c iNNER JOIN productos p ON c.id_producto = p.id_producto WHERE c.id_usuario = @IdUsuario;

--eliminar articulo del carrito
DELETE FROM carrito WHERE id_usuario = @IdUsuario AND id_producto = @IdProducto;

--vaciar carrito completo
DELETE FROM carrito WHERE id_usuario = @IdUsuario;

-- Modulo de Compras y Pedidos
-- Generar la cabecera del pedido (retornando el ID generado)
INSERT INTO Pedidos (id_usuario, total, fecha_pedido, direccion_entrega) 
OUTPUT INSERTED.id_pedido 
VALUES (@IdUsuario, @Total, GETDATE(), @DireccionEntrega);

-- Insertar cada artículo del carrito al detalle del pedido
INSERT INTO Detalles_Pedido (id_pedido, id_producto, cantidad, precio_unitario) 
VALUES (@IdPedido, @IdProducto, @Cantidad, @PrecioUnitario);

-- Descontar el stock de los productos comprados (Control de concurrencia)
UPDATE Productos 
SET stock = stock - @CantidadComprada 
WHERE id_producto = @IdProducto AND stock >= @CantidadComprada;

-- Consultar el historial de compras de un usuario
SELECT id_pedido, total
FROM Pedidos 
WHERE id_usuario = @IdUsuario 
ORDER BY fecha_pedido DESC;

-- Ver los artículos de un pedido específico (Recibo/Factura)
SELECT p.nombre, dp.cantidad, dp.precio_unitario, (dp.cantidad * dp.precio_unitario) AS subtotal 
FROM Detalles_Pedido dp 
INNER JOIN Productos p ON dp.id_producto = p.id_producto 
WHERE dp.id_pedido = @IdPedido;

--Modulo de Administración (Backoffice / Dashboard)
-- Crear un nuevo producto en el catálogo
INSERT INTO Productos (nombre, descripcion, precio, stock, categoria, imagen_url) 
VALUES (@Nombre, @Descripcion, @Precio, @Stock, @Categoria, @ImagenUrl);

-- Actualizar detalles o precio de un producto
UPDATE Productos 
SET precio = @Precio, 
    stock = @Stock, 
    descripcion = @Descripcion 
WHERE id_producto = @IdProducto;

-- Ver todos los pedidos de la plataforma paginados
SELECT id_pedido, id_usuario, total, estado_pedido, fecha_pedido 
FROM Pedidos 
ORDER BY fecha_pedido DESC 
OFFSET @Offset ROWS 
FETCH NEXT @Limite ROWS ONLY;

-- Avanzar el estado logístico de un pedido (Pendiente -> Enviado -> Entregado)
UPDATE Pedidos 
SET estado_pedido = @NuevoEstado 
WHERE id_pedido = @IdPedido;

-- Reporte estadístico de productos más vendidos
SELECT TOP 5 p.nombre, SUM(dp.cantidad) AS total_vendido 
FROM Detalles_Pedido dp 
INNER JOIN Productos p ON dp.id_producto = p.id_producto 
GROUP BY p.nombre 
ORDER BY total_vendido DESC;

-- Reporte de ingresos totales del mes actual
SELECT SUM(total) AS ingresos_mensuales 
FROM Pedidos 
WHERE MONTH(fecha_pedido) = MONTH(GETDATE()) 
  AND YEAR(fecha_pedido) = YEAR(GETDATE());


-- 1. Insertar dependencias necesarias (Proveedor y Repartidor)
-- Proveedor
INSERT INTO PROVEEDOR (NOMBRE_PROVEEDOR, TELEFONO_PROVEEDOR, CORREO_PROVEEDOR, DIRECCION, PAGO_ENVIO, CANTIDAD_PRODUCTO)
VALUES ('Boho Textil', '88887777', 'proveedor@bohotextil.com', 'Managua', 15.50, 100);


-- Repartidor
INSERT INTO repartidor (nombre_repartidor, celular_repartidor)
VALUES ('Juan Perez', '88889999');

-- 2. Insertar 4 Productos (Vestidos Boho Chic)
-- Asumiendo que el Proveedor y Repartidor anteriores tomaron el ID 1
INSERT INTO producto (id_repartidor, id_proveedor, nombre_producto, descripcion, color, estilo, categoria, marca, ruta_imagen)
VALUES 
(1, 1, 'Vestido Aurora', 'Vestido maxi floral fluido', 'Blanco', 'Maxi', 'F', 'Luna Fashion', '/img/aurora.webp'),
(1, 1, 'Vestido Brisa', 'Vestido corto con encaje y flecos', 'Beige', 'Corto', 'F', 'Luna Fashion', '/img/brisa.webp'),
(1, 1, 'Vestido Tierra', 'Vestido de lino natural fresco', 'Marron', 'Lino', 'F', 'Luna Fashion', '/img/tierra.webp'),
(1, 1, 'Vestido Sol', 'Vestido midi con volantes sutiles', 'Amarillo', 'Midi', 'F', 'Luna Fashion', '/img/sol.webp');


-- 3. Insertar 3 variantes por producto (Total 12 variantes)
INSERT INTO variante_producto (talla, precioVenta, stock, id_producto)
VALUES 
-- Variantes para Vestido Aurora (ID 1)
('S', 45.99, 10, 1),
('M', 45.99, 15, 1),
('L', 45.99, 5, 1),

-- Variantes para Vestido Brisa (ID 2)
('S', 39.50, 8, 2),
('M', 39.50, 12, 2),
('L', 39.50, 4, 2),

-- Variantes para Vestido Tierra (ID 3)
('S', 48.00, 5, 3),
('M', 48.00, 7, 3),
('L', 48.00, 3, 3),

-- Variantes para Vestido Sol (ID 4)
('S', 35.99, 15, 4),
('M', 35.99, 20, 4),
('L', 35.99, 10, 4);




