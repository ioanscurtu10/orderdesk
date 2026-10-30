# Ghid de citire a codului: de la Vue la React

Cele două aplicații fac exact același lucru, fișier cu fișier. Cel mai eficient mod de a învăța React din acest proiect este să deschizi perechea de fișiere una lângă alta și să compari.

## Ordinea recomandată

| Pas | Vue (știi deja)                          | React (de învățat)                                                      | Ce înveți                                                                                                                           |
| --- | ---------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `apps/vue/src/components/StatusChip.vue` | `apps/react/src/components/StatusChip.tsx`                              | O componentă = o funcție care întoarce JSX. Props sunt argumentul funcției.                                                         |
| 2   | `apps/vue/src/stores/ui.ts` (Pinia)      | `apps/react/src/stores/ui.ts` (Zustand)                                 | Store global. `useUiStore((s) => s.theme)` este echivalentul lui `storeToRefs`.                                                     |
| 3   | `apps/vue/src/components/AppShell.vue`   | `apps/react/src/components/AppShell.tsx`                                | `useState` în loc de `ref`, `useMediaQuery` în loc de `useDisplay`, `<Outlet/>` în loc de `<router-view/>`.                         |
| 4   | `apps/vue/src/router/index.ts`           | `apps/react/src/router.tsx` + `routes/guards.tsx`                       | Rute declarate ca obiecte. Guard-urile sunt componente care redau `<Navigate/>` sau `<Outlet/>`.                                    |
| 5   | `apps/vue/src/api/client.ts`             | `apps/react/src/api/client.ts`                                          | Identic. Interceptorul citește store-ul cu `useAuthStore.getState()` în afara componentelor.                                        |
| 6   | `apps/vue/src/stores/orders.ts`          | `apps/react/src/api/queries.ts`                                         | **TanStack Query.** `useQuery` înlocuiește `fetch + loading + error` din store. `useMutation` cu `onMutate` face optimistic update. |
| 7   | `apps/vue/src/views/LoginView.vue`       | `apps/react/src/pages/LoginPage.tsx`                                    | **React Hook Form + zod.** `register` leagă un input, `handleSubmit` validează cu schema.                                           |
| 8   | `apps/vue/src/views/DashboardView.vue`   | `apps/react/src/pages/DashboardPage.tsx`                                | `useMemo` în loc de `computed`. Opțiunile ECharts sunt identice.                                                                    |
| 9   | `apps/vue/src/views/OrdersView.vue`      | `apps/react/src/pages/OrdersPage.tsx`                                   | `useSearchParams` în loc de `route.query`. MUI Data Grid în loc de `v-data-table-server`.                                           |
| 10  | `apps/vue/src/views/OrderFormView.vue`   | `apps/react/src/pages/OrderFormPage.tsx` + `components/LinesEditor.tsx` | `useFieldArray` pentru liniile dinamice, `useWatch` pentru totaluri, `useBlocker` pentru modificări nesalvate.                      |
| 11  | `apps/vue/src/views/ImportView.vue`      | `apps/react/src/pages/ImportPage.tsx`                                   | Aceeași logică de parsare, doar sintaxa diferă.                                                                                     |

## Echivalențe rapide

| Vue 3                            | React                                               |
| -------------------------------- | --------------------------------------------------- |
| `ref(0)`                         | `const [n, setN] = useState(0)`                     |
| `computed(() => ...)`            | `useMemo(() => ..., [deps])`                        |
| `watch(x, cb)`                   | `useEffect(() => { cb() }, [x])`                    |
| `onMounted`                      | `useEffect(() => {...}, [])`                        |
| `defineProps`                    | argumentul funcției                                 |
| `defineEmits` + `emit('change')` | prop de tip funcție: `onChange={...}`               |
| `v-model`                        | `value` + `onChange`                                |
| `v-if` / `v-for`                 | `cond && <X/>` / `items.map(...)`                   |
| `<slot/>`                        | `children`                                          |
| `provide / inject`               | `createContext / useContext` (aici: `FormProvider`) |
| Pinia                            | Zustand                                             |
| fetch în store                   | TanStack Query                                      |

## Trei lucruri care surprind venind din Vue

1. **Totul se re-rulează.** Funcția componentei este apelată la fiecare render. De aceea există `useMemo` și `useCallback`: ele păstrează valori între render-uri. În Vue, `setup()` rulează o singură dată.
2. **Starea este imutabilă.** Nu modifici un obiect din state, creezi altul (`set({ ...s, theme })`). Zustand, TanStack Query și React Hook Form respectă toate regula asta.
3. **Efectele au dependențe explicite.** `useEffect(fn, [a, b])` rulează când `a` sau `b` se schimbă. ESLint (`react-hooks/exhaustive-deps`) te avertizează dacă uiți una. Vue urmărește dependențele automat.

## Cum verifici că ai înțeles

Rulează `npm run dev`, deschide ambele aplicații și schimbă ceva mic în React (de exemplu adaugă o coloană nouă în grid). Testele e2e (`npm run test:e2e -- --project=react`) îți spun imediat dacă ai stricat un flux.
