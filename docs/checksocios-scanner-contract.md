# CheckSocios 2.0 — Contrato del scanner

## Objetivo

App móvil para operadores internos de Villa Mitre (portería) que escanea códigos QR de socios o DNI y consulta al backend si la persona puede ingresar.

El frontend **no decide** semáforo, deuda, estado de socio ni permisos. Solo envía el payload escaneado y muestra el resultado que devuelve el backend.

## Endpoint

`POST /api/club-scanner/member-access/scan`

### Request

```json
{
  "qr_payload": "contenido-del-qr",
  "point": "portería_principal"
}
```

- `qr_payload`: contenido leído del QR o DNI ingresado manualmente.
- `point`: punto de acceso configurado en la app vía `EXPO_PUBLIC_SCANNER_POINT`.

### Response esperada

```json
{
  "type": "member_access",
  "status": "allowed",
  "title": "Puede ingresar",
  "message": "Socio habilitado.",
  "person": {
    "name": "Juan Pérez",
    "dni": "12345678"
  },
  "metadata": {
    "semaforo": "10",
    "saldo": "...",
    "ult_impago": "..."
  }
}
```

## Status posibles

| status | Uso en UI |
| --- | --- |
| `allowed` | Ingreso permitido (verde) |
| `allowed_with_warning` | Ingreso con advertencia / deuda (amarillo) |
| `rejected` | Ingreso bloqueado (rojo) |
| `expired` | Código o credencial vencida |
| `already_used` | Código ya utilizado |
| `invalid` | Payload inválido |
| `error` | Error de validación o fallo de backend |

El frontend **confía en `status`** devuelto por el backend. No aplica reglas legacy de semáforo.

## Regla legacy (solo referencia backend)

En checkSocios legacy, el backend interpretaba el semáforo así:

- `semaforo == 99` → rechazado
- `semaforo == 10` → permitido con advertencia
- otro valor → permitido

Esa lógica **no debe implementarse en React Native**. Si el backend expone `metadata.semaforo`, la app solo lo muestra como información.

## Variables de entorno

```env
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
EXPO_PUBLIC_SCANNER_POINT=portería_principal
```

## Próximos pasos

- Login de operador
- Token de autenticación en requests
- Logs de escaneo en backend
- QR tokenizado seguro
- Integración futura con pileta / gimnasio

## Fuera de alcance (MVP)

- Login real, roles, créditos, comercios
- Conexión directa a APIs legacy
- Descarga o almacenamiento de padrón completo
- Lógica local de semáforo
