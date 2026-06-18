# Design Spec: Login Page Redesign

**Date:** 2026-06-18  
**Author:** Claude (brainstorming session)  
**Status:** Approved

---

## Summary

Redesign the `LoginPage` component from a centered card layout to a Brickshare-style split-screen layout. Authentication logic (password-only) remains unchanged.

---

## Layout

Full-screen (`min-h-screen`) horizontal split:

| Panel | Width | Background |
|-------|-------|------------|
| Left (brand) | 45% | `slate-800` |
| Right (form) | 55% | `white` |

On mobile (`< md`): left panel is hidden, right panel is full-width centered.

---

## Left Panel

**Background:** `bg-slate-800`  
**Layout:** `flex flex-col justify-center items-center h-full gap-6 p-12`

Contents (vertically centered):
1. **Logo row** — blue square icon (`bg-blue-500 rounded-xl w-10 h-10`) with "A" + `text-white text-2xl font-bold` "하이미디어 안양"
2. **Tagline** — `text-slate-300 text-lg` "관리자 DashBoard"
3. **Divider** — thin `border-t border-slate-600 w-16 my-2`
4. **Description** — `text-slate-400 text-sm text-center max-w-xs` "관리자 전용 접근 시스템입니다."

---

## Right Panel

**Background:** `bg-white`  
**Layout:** `flex flex-col justify-center items-center h-full p-16`  
**Form container:** `w-full max-w-sm`

Contents:
1. **Title** — `text-2xl font-semibold text-slate-800 mb-8` "관리자 로그인"
2. **Password field:**
   - Lock icon (lucide-react `Lock`, `text-slate-400 w-4 h-4`)
   - Underline-only input (`border-b border-slate-300 focus:border-blue-500`)
   - Placeholder: "비밀번호를 입력하세요"
3. **Login button** — `w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-8 transition-colors disabled:opacity-50`
   - Text: "로그인" / loading: "로그인 중..."
4. **Error message** — `text-red-500 text-sm mt-3` (conditionally rendered)

---

## Component Structure

```
LoginPage (existing file, full replacement)
  └─ Left panel (brand section)
  └─ Right panel
       └─ form (existing handleSubmit logic, unchanged)
```

No new files needed. `LoginPage.tsx` is the only file changed.

---

## Unchanged

- `auth.tsx` — no changes
- `handleSubmit` logic — no changes
- Error messages — no changes
- Routing — no changes

---

## Claude Design Deliverable

A static HTML/CSS preview of the redesigned login page will be published to Claude Design for visual verification before final code merge.
