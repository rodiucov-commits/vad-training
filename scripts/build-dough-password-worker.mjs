import fs from 'node:fs';
import {recipes} from '../dough/recipes.js';
import {pizzaLoversRecipes} from '../dough/pizzalovers.js';
const auth=fs.readFileSync(new URL('./dough-password-auth.mjs',import.meta.url),'utf8').replaceAll('export ','');
const archive=fs.readFileSync(new URL('./dough-recipe-archive.mjs',import.meta.url),'utf8').replaceAll('export ','');
const book=JSON.parse(fs.readFileSync(new URL('../dough/hamelman-book.json',import.meta.url),'utf8'));
const allowed=[...new Set([...recipes.filter(r=>r.tag!=='Calculator'&&!r.temperature),...pizzaLoversRecipes,...book.recipes].map(r=>r.id))];
const handler=fs.readFileSync(new URL('./dough-password-handler.mjs',import.meta.url),'utf8');
fs.writeFileSync(new URL('../dough/_worker.js',import.meta.url),auth+'\n'+archive+'\nconst recipeArchive=createRecipeArchive('+JSON.stringify(allowed)+');\n'+handler);
