const fs = require('fs');
let content = fs.readFileSync('src/DemoApp.tsx', 'utf8');

// The AuthUser imports and types were fixed, but we need to move AuthUser import to the top
content = content.replace(/import \{ AuthUser \} from '\.\/auth\/types';\n/, '');
content = content.replace(/import React, \{ useState, useRef, useEffect, useMemo \} from 'react';/, "import React, { useState, useRef, useEffect, useMemo } from 'react';\nimport { AuthUser } from './auth/types';");

// Remove (currentUser.role as Role)
content = content.replace(/\(currentUser\.role as Role\)/g, 'currentUser.role');

fs.writeFileSync('src/DemoApp.tsx', content, 'utf8');
