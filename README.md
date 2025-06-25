# 3MG Roofing Estimator - Admin & Manager Release

This is a production-ready version of the 3MG Roofing Estimator, focused on providing immediate, stable functionality for Admins and Territory Managers.

## 🚀 **Deployment & Access**

This version is deployed on Netlify from the `release/admin-estimator-v1` branch.

### **Authentication**
- **Registration**: `/register` - Managers can self-register with their `@3mgroofing.com` email and password.
- **Email Confirmation**: New users must confirm their email address before logging in.
- **Login**: `/login` - Standard email and password login.
- **Admin Access**: Admins are created via the Supabase dashboard and have full system access.

---

## ✅ **Core Features**

### **1. Role-Based Permissions**
- **Admins**: Full control over all estimates, pricing, users, and territories.
- **Managers**: Can create estimates, approve/reject estimates within their assigned territory, and have a restricted profit margin of 30-35%.

### **2. Estimate Workflow**
- Create, edit, and manage detailed roofing estimates.
- Territory-based approval workflow for managers.
- Real-time updates for new estimates and status changes.

### **3. Pricing & Materials**
- Admins can manage material prices and pricing templates.
- **Managers cannot change material prices.**
- Profit margins are enforced based on user role.

### **4. User & Territory Management**
- Admins can invite new users and assign them to roles and territories.
- A simplified user management interface for admins.

---

## 📋 **Next Sprint: Enhancements & Polish**

### **Priority 1: Subtrade Workflow**
- **Objective**: Integrate subtrade pricing and management into the estimate process.
- **Tasks**:
  1.  **Meet with Subtrade Team**: Finalize the list of services and their pricing models.
  2.  **Subtrade Manager Role**: Create a new `subtrade_manager` role with a dedicated dashboard to view and price requested jobs.
  3.  **UI Integration**: Add a "Request Subtrade Pricing" button to the estimate creation flow.
  4.  **Notifications**: Implement real-time notifications to alert subtrade managers of new requests.

### **Priority 2: Client-Facing PDF Generation**
- **Objective**: Create a professional, customer-facing PDF proposal.
- **Tasks**:
  1.  **Finalize Marketing Template**: Incorporate the theme, colors, and terms provided by the marketing team.
  2.  **Implement PDF Generation**: Use a Supabase Edge Function to generate the PDF from the client-safe estimate data.
  3.  **"Download Proposal" Button**: Add a button to the estimate summary for managers and admins to download the final PDF.

### **Priority 3: Mobile Experience**
- **Objective**: Ensure a seamless experience for managers and admins on tablets and mobile devices.
- **Tasks**:
  1.  **Full Responsive Audit**: Test and refine all components on various screen sizes.
  2.  **Touch-Friendly UI**: Increase tap targets and ensure easy navigation on mobile.
  3.  **Performance Optimization**: Optimize image sizes and lazy-load components for faster mobile loading.

### **Priority 4: Testing & QA**
- **Objective**: Ensure the stability and reliability of the platform.
- **Tasks**:
  1.  **E2E Testing**: Create Playwright tests for the core admin and manager workflows (login → create estimate → approve).
  2.  **Unit Testing**: Add unit tests for critical business logic, such as the estimate calculation engine.

---

This README provides a clear overview of the current release and a detailed plan for the upcoming sprints. Let me know if you'd like any adjustments.
