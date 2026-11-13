USE PROYECTO;
GO

IF COL_LENGTH(N'dbo.usuario', N'password_hash') IS NULL
BEGIN
    ALTER TABLE dbo.usuario ADD password_hash NVARCHAR(255) NULL;
END;
GO

DECLARE @legacyPasswordColumn SYSNAME;
DECLARE @alterPasswordColumn NVARCHAR(MAX);

SELECT TOP (1) @legacyPasswordColumn = name
FROM sys.columns
WHERE object_id = OBJECT_ID(N'dbo.usuario')
  AND name LIKE N'contrase%';

IF @legacyPasswordColumn IS NOT NULL
BEGIN
    SET @alterPasswordColumn =
        N'ALTER TABLE dbo.usuario ALTER COLUMN '
        + QUOTENAME(@legacyPasswordColumn)
        + N' NVARCHAR(250) NULL;';
    EXEC sp_executesql @alterPasswordColumn;
END;
GO

IF COL_LENGTH(N'dbo.carrito', N'estado_pedido') IS NULL
BEGIN
    ALTER TABLE dbo.carrito
    ADD estado_pedido NVARCHAR(32) NOT NULL
        CONSTRAINT DF_carrito_estado_pedido DEFAULT N'ACTIVO';
END;
GO

IF COL_LENGTH(N'dbo.carrito', N'numero_referencia') IS NULL
BEGIN
    ALTER TABLE dbo.carrito ADD numero_referencia NVARCHAR(50) NULL;
END;
GO

IF COL_LENGTH(N'dbo.carrito', N'direccion_entrega') IS NULL
BEGIN
    ALTER TABLE dbo.carrito ADD direccion_entrega NVARCHAR(200) NULL;
END;
GO

UPDATE carrito
SET estado_pedido = N'PEDIDO_ANTERIOR'
WHERE estado_pedido = N'ACTIVO'
  AND EXISTS (
      SELECT 1
      FROM factura
      WHERE factura.id_carrito = carrito.id_carrito
  );
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.carrito')
      AND name = N'IX_carrito_usuario_estado'
)
BEGIN
    CREATE INDEX IX_carrito_usuario_estado
        ON dbo.carrito (id_usuario, estado_pedido, id_carrito DESC);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.carrito')
      AND name = N'UX_carrito_numero_referencia'
)
BEGIN
    CREATE UNIQUE INDEX UX_carrito_numero_referencia
        ON dbo.carrito (numero_referencia)
        WHERE numero_referencia IS NOT NULL;
END;
GO

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.variante_producto')
      AND name = N'CK_variante_producto_stock'
)
BEGIN
    ALTER TABLE dbo.variante_producto
        DROP CONSTRAINT CK_variante_producto_stock;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.variante_producto')
      AND name = N'CK_variante_producto_stock'
)
BEGIN
    ALTER TABLE dbo.variante_producto
        ADD CONSTRAINT CK_variante_producto_stock CHECK (stock >= 0);
END;
GO
