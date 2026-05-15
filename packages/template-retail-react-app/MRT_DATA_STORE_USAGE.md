# MRT Data Store Usage Guide

This guide shows how to access MRT Data Store custom preferences in different contexts within your PWA Kit application.

## Table of Contents
- [Configuration](#configuration)
- [Usage in ssr.js (Server Middleware)](#usage-in-ssrjs-server-middleware)
- [Usage in React Components (Hooks)](#usage-in-react-components-hooks)
- [Local Development](#local-development)

---

## Configuration

Enable MRT Data Store in `config/default.js`:

```javascript
module.exports = {
    app: {
        mrtDataStore: {
            enabled: true  // Enable MRT Data Store bootstrap
        },
        // ... rest of config
    }
}
```

Or use environment variable:
```bash
PWAKIT_MRT_DATA_STORE_ENABLED=true npm start
```

---

## Usage in ssr.js (Server Middleware)

```javascript
// app/ssr.js
import {
    getCustomSitePreferences,
    getCustomGlobalPreferences
} from '@salesforce/pwa-kit-runtime/utils/ssr-server'

export default function(app) {
    app.use(async (req, res, next) => {
        const siteId = res.locals.site?.id
        
        const [sitePrefs, globalPrefs] = await Promise.all([
            getCustomSitePreferences({siteId}),
            getCustomGlobalPreferences()
        ])
        
        if (sitePrefs.maintenanceMode) {
            return res.status(503).send('Maintenance')
        }
        
        next()
    })

    app.get('/api/config', async (req, res) => {
        const siteId = res.locals.site?.id
        const prefs = await getCustomSitePreferences({siteId})
        
        res.json({
            enableFeature: prefs.enableFeature || false
        })
    })
}
```

---

## Usage in React Components (Utilities)

Use the async utility functions directly in page components with `getProps` for server-side data fetching.

```javascript
// app/pages/product-list/index.jsx
import React from 'react'
import {getCustomSitePreferences} from '@salesforce/pwa-kit-runtime/utils/data-store/ssr-site-preferences.server'

const ProductList = ({itemsPerPage}) => {
    return <ProductGrid itemsPerPage={itemsPerPage} />
}

ProductList.getProps = async ({res}) => {
    const siteId = res.locals.site?.id
    const prefs = await getCustomSitePreferences({siteId})
    
    return {
        itemsPerPage: prefs.productsPerPage || 12
    }
}

export default ProductList
```

```javascript
// app/pages/home/index.jsx
import React from 'react'
import {
    getCustomSitePreferences,
    getCustomGlobalPreferences
} from '@salesforce/pwa-kit-runtime/utils/ssr-server'

const Home = ({showBanner, enableChat}) => {
    return (
        <div>
            {showBanner && <HeroBanner />}
            {enableChat && <ChatWidget />}
        </div>
    )
}

Home.getProps = async ({res}) => {
    const siteId = res.locals.site?.id
    
    const [sitePrefs, globalPrefs] = await Promise.all([
        getCustomSitePreferences({siteId}),
        getCustomGlobalPreferences()
    ])
    
    return {
        showBanner: sitePrefs.showBanner || false,
        enableChat: globalPrefs.enableChat || false
    }
}

export default Home
```

---

## Usage in React Components (Hooks)

> **Note:** The hooks API will be available in an upcoming release (v3.19.0+). For current versions, use the utilities with `getProps` (see above).

```javascript
// app/pages/product-list/index.jsx
import React from 'react'
import {useCustomSitePreferences} from '@salesforce/pwa-kit-react-sdk/ssr/universal/hooks'

const ProductList = () => {
    const prefs = useCustomSitePreferences()
    const itemsPerPage = prefs.productsPerPage || 12
    
    return <ProductGrid itemsPerPage={itemsPerPage} />
}

export default ProductList
```

```javascript
// app/components/product-tile/index.jsx
import React from 'react'
import {useCustomSitePreferences} from '@salesforce/pwa-kit-react-sdk/ssr/universal/hooks'

const ProductTile = ({product}) => {
    const prefs = useCustomSitePreferences()
    
    return (
        <div>
            <h3>{product.name}</h3>
            <button>Add to Cart</button>
            {prefs.enableWishlist && <button>Add to Wishlist</button>}
        </div>
    )
}
```

```javascript
// app/pages/home/index.jsx
import React from 'react'
import {
    useCustomSitePreferences,
    useCustomGlobalPreferences
} from '@salesforce/pwa-kit-react-sdk/ssr/universal/hooks'

const Home = () => {
    const sitePrefs = useCustomSitePreferences()
    const globalPrefs = useCustomGlobalPreferences()
    
    return (
        <div>
            {sitePrefs.showBanner && <HeroBanner />}
            {globalPrefs.enableChat && <ChatWidget />}
        </div>
    )
}
```

---

## Local Development

```bash
MRT_DATA_STORE_DEFAULTS='{
  "custom-global-preferences": {"enableChat": true},
  "RefArch-custom-site-preferences": {"productsPerPage": 24}
}' PWAKIT_MRT_DATA_STORE_ENABLED=true npm start
```

**Data Store Keys:**
- Global: `custom-global-preferences`
- Site: `{siteId}-custom-site-preferences`

**Demo:** `http://localhost:3000/demo-mrt-data-store`

---

## Related Documentation

- [MRT Data Store Configuration](./config/default.js)
- [Demo Page](./app/pages/demo-mrt-data-store/index.jsx)
- [PWA Kit Runtime Docs](../pwa-kit-runtime/README.md)
