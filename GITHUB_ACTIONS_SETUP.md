# 🚀 Configuración de GitHub Actions para Build de Android

## Paso 1: Subir el Workflow a GitHub

Ya creamos el archivo `.github/workflows/build-android.yml`. Ahora súbelo a GitHub:

```bash
git add .github/workflows/build-android.yml
git commit -m "Add GitHub Actions workflow for Android build"
git push origin master
```

---

## Paso 2: Configurar Secrets en GitHub

Para que el workflow funcione, necesitas agregar 3 secrets a tu repositorio:

### 2.1 Ir a Settings → Secrets and Variables → Actions

1. Abre tu repositorio en GitHub: https://github.com/Carlosrestrepo96/elishama-populi
2. Ve a **Settings** (pestaña superior)
3. En el menú lateral, ve a **Secrets and variables** → **Actions**
4. Click en **New repository secret**

### 2.2 Agregar los Secrets

Crea estos 3 secrets (uno a la vez):

#### Secret 1: KEYSTORE_BASE64
**Name**: `KEYSTORE_BASE64`  
**Value**: Copia TODO el contenido del archivo `keystore_base64.txt`

```
(Abre keystore_base64.txt y copia todo su contenido aquí)
```

#### Secret 2: KEYSTORE_PASSWORD
**Name**: `KEYSTORE_PASSWORD`  
**Value**: `EliShamaSecure2026!`

#### Secret 3: KEY_PASSWORD
**Name**: `KEY_PASSWORD`  
**Value**: `EliShamaSecure2026!`

---

## Paso 3: Ejecutar el Workflow

### Opción A: Push a main/master (Automático)
Cualquier push a la rama `master` ejecutará el workflow automáticamente.

### Opción B: Ejecución Manual
1. Ve a la pestaña **Actions** en GitHub
2. Selecciona "Build Android AAB" en el menú lateral
3. Click en **Run workflow**
4. Selecciona la rama `master`
5. Click en **Run workflow** (botón verde)

---

## Paso 4: Descargar el AAB

Una vez que el workflow termine (tarda ~5-7 minutos):

1. Ve a la pestaña **Actions** en GitHub
2. Click en el workflow ejecutado (check verde ✅)
3. Baja hasta la sección **Artifacts**
4. Descarga `app-release-bundle`
5. Descomprime el ZIP → Obtendrás `app-release-bundle.aab`

Este archivo `.aab` es el que subes a Google Play Console.

---

## Paso 5: Subir a Play Store

### 5.1 Crear Cuenta de Desarrollador
- Regístrate en https://play.google.com/console
- Pago único de $25 USD

### 5.2 Crear Nueva Aplicación
1. Click en **Create app**
2. Llena la información básica:
   - **App name**: EliShama Populi
   - **Default language**: Spanish (Colombia)
   - **App or game**: App
   - **Free or paid**: Free

### 5.3 Completar el App Content
- **Privacy policy**: https://elishama-populi.netlify.app/privacy-policy
- **App category**: Social / Government
- **Contact details**: Tu email

### 5.4 Subir el AAB
1. Ve a **Production** → **Create new release**
2. Upload el archivo `app-release-bundle.aab`
3. Agrega notas de la versión (Release notes)
4. Click en **Save** → **Review release** → **Start rollout to Production**

### 5.5 Agregar Assets
En Store listing:
- **App icon**: Usa `public/pwa-512x512.png`
- **Feature graphic**: Crea un banner 1024x500 (puedes usar Canva)
- **Screenshots**: Captura 2-8 pantallas de la app funcionando
- **Short description**: "Plataforma segura de votación digital con transparencia y auditabilidad total"
- **Full description**: Usa el contenido de `play-store-assets/store-listing.md`

---

## Paso 6: Verificación Digital Asset Links

Asegúrate de que tu archivo `assetlinks.json` sea accesible:

**URL a verificar**: https://elishama-populi.netlify.app/.well-known/assetlinks.json

Si no es accesible, necesitas configurar Netlify para servir el archivo correctamente.

---

## Troubleshooting

### Error: "Keystore not found"
- Verifica que el secret `KEYSTORE_BASE64` esté correctamente copiado (todo el contenido)

### Error: "Wrong password"
- Verifica que `KEYSTORE_PASSWORD` y `KEY_PASSWORD` sean exactamente: `EliShamaSecure2026!`

### El workflow no se ejecuta
- Asegúrate de hacer push a la rama `master` (no `main`)
- O usa "Run workflow" manual desde la pestaña Actions

---

## 📋 Checklist de Publicación

- [ ] Workflow subido a GitHub
- [ ] 3 secrets configurados en GitHub
- [ ] Workflow ejecutado exitosamente
- [ ] AAB descargado
- [ ] Cuenta de desarrollador de Play Store creada
- [ ] App creada en Play Console
- [ ] AAB subido a Play Console
- [ ] Assets agregados (ícono, screenshots, banner)
- [ ] Privacy policy publicada y URL agregada
- [ ] Digital Asset Links verificado
- [ ] App enviada para revisión

---

¡Listo! Tu app estará en Play Store en 1-3 días dependiendo de la revisión de Google.
