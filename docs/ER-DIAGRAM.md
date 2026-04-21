# FanCake Database Schema - ER Diagram

## 📊 Entity Relationship Diagram

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    PROFILES     │      │      WORKS      │      │    CHAPTERS     │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ id (PK)         │◄────┤ creator_id (FK)  │      │ id (PK)         │
│ auth_id         │      │ id (PK)         │◄────┤ work_id (FK)     │
│ username        │      │ title           │      │ chapter_number  │
│ email           │      │ slug            │      │ title           │
│ is_creator      │      │ content_type    │      │ content         │
│ wallet_balance  │      │ is_free         │      │ is_free         │
│ ...             │      │ price           │      │ price           │
└─────────────────┘      │ status          │      └─────────────────┘
        │                │ ...             │              │
        │                └─────────────────┘              │
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     FOLLOWS     │      │      LIKES      │      │   COMMENTS      │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ follower_id (FK)│      │ user_id (FK)    │      │ id (PK)         │
│ following_id (FK)│     │ work_id (FK)    │      │ work_id (FK)    │
│ created_at      │      │ created_at      │      │ user_id (FK)    │
└─────────────────┘      └─────────────────┘      │ parent_id (FK)  │
        │                                          │ content         │
        │                                          └─────────────────┘
        │                                                  │
        ▼                                                  │
┌─────────────────┐                                        │
│   PURCHASES     │      ┌─────────────────┐              │
├─────────────────┤      │ READING_PROGRESS│              │
│ id (PK)         │      ├─────────────────┤              │
│ user_id (FK)    │      │ user_id (FK)    │              │
│ work_id (FK)    │      │ work_id (FK)    │              │
│ chapter_id (FK) │      │ chapter_id (FK) │              │
│ amount          │      │ last_position   │              │
│ status          │      │ completed       │              │
└─────────────────┘      └─────────────────┘              │
        │                                                  │
        └──────────────────────────────────────────────────┘
```

## 🏗️ Core Tables Description

### 1. **profiles** - Users/Creators
- Main user table linked to Supabase Auth
- Creator flag for content creators
- Wallet for monetization
- Social stats (followers, following)

### 2. **works** - Content/Publications
- Main content table (articles, stories, books)
- Monetization settings (free/paid, price)
- Status lifecycle (draft → published → archived)
- Full-text search support

### 3. **chapters** - Serialized Content
- For multi-chapter works (books, serials)
- Individual chapter pricing
- Chapter numbering system

## 🤝 Social Interactions

### 4. **follows** - Follow Relationships
- Many-to-many between profiles
- Prevents self-follows

### 5. **likes** - Content Likes
- Simple like system
- Unique constraint per user/work

### 6. **comments** - Comment System
- Hierarchical comments (reply support)
- Edit tracking

## 💰 Monetization System

### 7. **purchases** - Transactions
- Records all purchases
- Integration with Stripe
- Status tracking (pending → completed)

### 8. **reading_progress** - User Progress
- Tracks reading position per chapter
- Completion status

## 🚀 Performance Optimizations

### Indexes Applied:
- **profiles**: username, email, creator status, creation date
- **works**: creator, status, publication date, full-text search
- **chapters**: work reference, chapter numbers
- **Social tables**: user/work references for fast joins

### Constraints:
- Username validation regex
- Status enum checks
- Unique constraints to prevent duplicates

## 🔄 Migration Strategy (Option B)

This is **Migration 001** - Initial schema. Following migrations will include:

1. **002-rls-policies.sql** - Row Level Security
2. **003-authentication-setup.sql** - Auth integration (Option A)
3. **004-sample-data.sql** - Test data
4. **005-performance-optimizations.sql** - Additional indexes

## 📈 Scalability Considerations

### For Performance (Priority #1):
- All foreign keys indexed
- Full-text search on works
- Pagination-ready timestamp indexes
- Denormalized counts (follower_count, etc.)

### For Maintainability (Priority #2):
- Clear naming conventions
- Commented constraints
- Migration versioning
- Audit triggers (updated_at)

### For Costs (Priority #3):
- Efficient data types
- Appropriate indexes (not over-indexing)
- Partitioning-ready structure
- Archive strategy for old data

## 🔍 Next Steps

1. **Review this schema** - Corrections needed?
2. **Add RLS policies** - Security implementation
3. **Test with sample data** - Verify relationships
4. **Deploy to Supabase** - Apply migration