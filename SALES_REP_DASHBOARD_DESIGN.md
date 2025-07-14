# Sales Rep Dashboard Design Document

## 🎯 **Design Vision**
A modern, intuitive dashboard designed specifically for sales representatives (project managers) to streamline the estimate creation process.

## 📱 **Responsive Design Requirements**
- **Desktop**: Full-width layout with sidebar navigation
- **Tablet (iPad)**: Responsive grid layout, touch-friendly interactions
- **Mobile**: Single-column stacked layout, optimized for mobile browsers

## 🏗️ **Dashboard Layout Structure**

### **1. Header Section**
```
┌─────────────────────────────────────────────────────────────┐
│  3MG Roofing Logo    [Taylor Hilton - Sales Rep]  [Logout] │
│  Winter Park Territory                                       │
└─────────────────────────────────────────────────────────────┘
```

### **2. Hero Section**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│      🏠 Welcome Back, Taylor!                              │
│      Ready to create your next estimate?                    │
│                                                             │
│        ┌─────────────────────────────────────┐             │
│        │     📋 CREATE NEW ESTIMATE          │             │
│        │         Start Upload Process        │             │
│        └─────────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **3. Progress Metrics Row**
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  │   📊 My     │  │   ⏳ Pending │  │   ✅ Accepted│  │   💰 Total   │
│  │ Estimates   │  │  Approval   │  │  Estimates  │  │   Value     │
│  │     5       │  │     2       │  │     3       │  │  $45,000    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
└─────────────────────────────────────────────────────────────┘
```

### **4. Territory Information Card**
```
┌─────────────────────────────────────────────────────────────┐
│  🗺️ Winter Park Territory                                  │
│  ──────────────────────────────                              │
│  Territory Managers: Chase Lovejoy, Adam                    │
│  Coverage Area: Central Florida                             │
│  📧 Need help? Contact your territory managers              │
└─────────────────────────────────────────────────────────────┘
```

### **5. Recent Activity Timeline**
```
┌─────────────────────────────────────────────────────────────┐
│  📅 Recent Activity                                         │
│  ─────────────────                                           │
│  • 🏠 Smith Residence - Submitted for approval (2 hrs ago)  │
│  • 📋 Johnson Project - Approved by Chase (1 day ago)       │
│  • 📊 Williams Estimate - Uploaded measurements (2 days ago)│
│  • ✅ Brown Roofing - Estimate accepted (3 days ago)        │
│                                                             │
│  [View All Activity]                                        │
└─────────────────────────────────────────────────────────────┘
```

### **6. Quick Actions Panel**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚡ Quick Actions                                           │
│  ─────────────────                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  │  📄 View My     │  │  📞 Contact     │  │  💡 Help &      │
│  │   Estimates     │  │   Managers      │  │   Resources     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘
└─────────────────────────────────────────────────────────────┘
```

## 🎨 **Design Principles**

### **Visual Hierarchy**
1. **Primary Action**: "Create New Estimate" button - most prominent
2. **Secondary Actions**: Progress metrics and territory info
3. **Tertiary Content**: Recent activity and quick actions

### **Color Scheme**
- **Primary**: 3MG Green (#0F9D58)
- **Secondary**: Clean whites and light grays
- **Accent**: Blue for informational elements
- **Success**: Green for completed actions
- **Warning**: Orange for pending items

### **Typography**
- **Headers**: Bold, clear hierarchy
- **Body Text**: Readable, professional
- **Buttons**: Clear, action-oriented language

## 📊 **Interactive Components**

### **Progress Metrics Cards**
- **Hover Effects**: Subtle lift and shadow
- **Click Action**: Navigate to filtered estimate list
- **Visual Indicators**: Progress bars, status colors
- **Responsive**: Stack on mobile, grid on desktop

### **Create New Estimate Button**
- **Size**: Large, prominent positioning
- **Animation**: Subtle hover effects
- **Icon**: Document or plus icon
- **Action**: Direct to upload workflow

### **Activity Timeline**
- **Expandable**: Show more/less functionality
- **Status Icons**: Visual indicators for each activity type
- **Timestamps**: Relative time display
- **Clickable**: Link to relevant estimates

## 🔧 **Technical Implementation**

### **React Components Structure**
```
SalesRepDashboard.tsx
├── DashboardHeader.tsx
├── HeroSection.tsx
├── MetricsRow.tsx
│   └── ProgressMetricCard.tsx
├── TerritoryInfoCard.tsx
├── ActivityTimeline.tsx
│   └── ActivityItem.tsx
└── QuickActionsPanel.tsx
```

### **Data Requirements**
- **User Profile**: Name, role, territory assignment
- **Territory Info**: Name, managers, coverage area
- **Estimates**: Count by status, total value
- **Recent Activity**: Timeline of user actions
- **Quick Actions**: Contextual action buttons

### **State Management**
- **Local State**: UI interactions, loading states
- **Context**: User profile, territory information
- **API Calls**: Estimate counts, recent activity data

## 📱 **Mobile Optimization**

### **Responsive Breakpoints**
- **Mobile**: < 768px - Single column, stacked layout
- **Tablet**: 768px - 1024px - Two-column grid
- **Desktop**: > 1024px - Full multi-column layout

### **Touch Interactions**
- **Button Sizes**: Minimum 44px touch targets
- **Spacing**: Adequate spacing between interactive elements
- **Gestures**: Swipe support for activity timeline

### **Performance**
- **Lazy Loading**: Progressive loading of non-critical content
- **Caching**: Cache frequently accessed data
- **Optimization**: Minimize API calls, efficient re-renders

## 🚀 **Implementation Priority**

### **Phase 1: Core Layout**
1. Header and hero section
2. Progress metrics cards
3. Create new estimate button

### **Phase 2: Content Areas**
4. Territory information card
5. Activity timeline
6. Quick actions panel

### **Phase 3: Polish**
7. Responsive design refinements
8. Animation and interaction polish
9. Performance optimization

## ✅ **Success Metrics**
- **User Engagement**: Time spent on dashboard
- **Task Completion**: Estimate creation start rate
- **Mobile Usage**: Successful mobile interactions
- **User Satisfaction**: Feedback from sales reps

This design creates a focused, intuitive experience that guides sales reps through their primary workflow while providing all necessary information at a glance. 