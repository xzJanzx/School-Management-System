# SMS — Module 02 — Parent / Guardian — Module Extract

## Source note
This file is an extract for navigation. The intact original sources are preserved in `../source/`.

## Original Student Affairs Decomposition — exact extracted section

# 09 — Parent / Guardian

نحتاج تصميم ولي الأمر ككيان مستقل، وليس مجرد:

```text id="h6hgpe"
FatherName
MotherName
```

لأن نفس ولي الأمر قد يكون لديه أكثر من طالب.

مثلاً:

```text id="9qi2ti"
ولي الأمر
   │
   ├── أحمد
   ├── محمد
   └── سارة
```

وهذا سيفيدنا لاحقًا في:

- التواصل
- الحسابات
- الإخطارات
- التقارير
- متابعة الإخوة

لكن **تفاصيل الحقول والعلاقات النهائية تحتاج اعتمادًا منك.**

---

# 10 — Student Status & Lifecycle

يجب أن نميز بين:

### البيانات الأساسية

و

### حالة الطالب الحالية

و

### تاريخ الحالات

مثلاً:

```text id="sxm6vs"
طالب
 │
 ├── Active
 │
 └── Status History
      ├── New
      ├── Enrolled
      ├── Transferred
      └── ...
```

وبذلك لا نحذف التاريخ السابق عندما تتغير حالة الطالب.

---

# 11 — Reports

سنقسم التقارير إلى:

### تقارير الطلاب

- كشف جميع الطلاب
- كشف حسب الصف
- كشف حسب الفصل
- كشف حسب الحالة
- بيانات طالب
- كشف الطلاب الجدد
- كشف المنقولين
- كشف المتخرجين

### تقارير القيد

- إجمالي الطلاب
- توزيع الطلاب حسب الصف
- توزيع حسب الفصل
- توزيع ذكور/إناث
- مقارنة الأعوام الدراسية

### تقارير العمليات

- عمليات النقل
- عمليات الترفيع
- عمليات تعديل بيانات الطلاب
- المستخدمون الذين قاموا بالتعديلات

وسنحدد لاحقًا **كل تقرير: الفلاتر + الأعمدة + التجميع + الطباعة + التصدير**.

---

# 12 — Security & Audit

هذه نقطة غير قابلة للتجاهل.

المرجع حدد أن النظام يحتاج إلى **Role-Based Permissions** و **Audit Trail**. fileciteturn1file3turn1file14

لذلك في شئون الطلبة سنسجل مثلاً:

```text id="k5joak"
User
Action
Entity
EntityId
Old Value
New Value
DateTime
Workstation
```

مثال:

> المستخدم: موظف شئون الطلبة  
> العملية: تعديل رقم الهاتف  
> الطالب: 10025  
> القيمة القديمة: 010xxxx  
> القيمة الجديدة: 011xxxx  
> التاريخ: ...

ولا نسمح بالحذف الفيزيائي للبيانات الحساسة إلا وفق سياسة إدارية محددة.

---

# 🧩 الهيكل المبدئي للموديول

بالتالي أصبح عندنا:

```text id="828u3l"
STUDENT AFFAIRS
│
├── Student Management
│   ├── Add Student
│   ├── Edit Student
│   ├── View Student
│   ├── Search
│   └── Student Profile
│
├── Enrollment
│   ├── New Enrollment
│   ├── Re-enrollment
│   ├── Academic History
│   └── Status
│
├── Guardians
│
├── Transfers
│   ├── Internal
│   ├── Incoming
│   └── Outgoing
│
├── Promotion
│   ├── Individual
│   └── Bulk
│
├── Documents
│
├── Reports
│
└── Audit
```

## لكن لن ننتقل للـ Database بعد

وهذه نقطة مهمة جدًا.

قبل أن نكتب:

- Tables
- Columns
- Foreign Keys
- APIs
- Screens
- Code
- Prompts لـ Google AI Studio

سنقوم أولًا بعمل **تفكيك وظيفي كامل**.

أي أن الخطوة التالية ستكون:

### Student Affairs — Functional Specification

وسنفصل **كل شاشة شاشة**:

```text id="s2vznb"
Screen ID
Screen Name
Purpose
Who Can Access
Fields
Field Type
Required / Optional
Validation
Default Value
Actions
Business Rules
Success
Errors
Permissions
Audit
Related Entities
```

ثم بعد إغلاق الشاشات ننتقل إلى:

**Workflows → Business Rules → Entities → Database → API → Permissions → Reports → Acceptance Criteria → Master Prompt لـ Google AI Studio.**

وهذا أفضل بكثير من أن نبدأ بالكود مباشرة، خصوصًا أنك ستستخدم Google AI Studio في التنفيذ؛ لأن المرجع نفسه يحدد أن العمل سيكون على شكل **Master Specification → Phases → Prompts → تنفيذ → اختبار → إصلاح → المرحلة التالية**. fileciteturn1file14

**إذن: شئون الطلبة أصبح الآن الموديول الوحيد قيد العمل، ولن ننتقل لغيره حتى نقول صراحة: `STUDENT AFFAIRS — SPECIFICATION FROZEN`.**

## Project Context — exact module section extracted from uploaded context

MODULE 02
Parent / Guardian

## Prompt chain recorded in the uploaded Master Project Prompt Index
02.01 Specification & Implementation Scope — APPROVED
02.02 Decomposition & Acceptance Matrix — APPROVED
02.03 Continuation Implementation Prompt — EXECUTED
02.04 Verification & Gap-Fix — COMPLETED
02.05 Independent Verification & Acceptance — ACCEPTED
