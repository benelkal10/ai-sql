# AI-SQL Project Rules

## Core Technologies
- **Backend:** Node.js, Express.js
- **Database Driver:** `mssql` with `msnodesqlv8` (Windows Authentication)
- **AI Integration:** OpenAI API (GPT-4o or GPT-3.5-turbo)
- **Frontend:** Vanilla HTML, CSS (Modern Dark Theme), JavaScript

## SQL Safety Rules
1. Only **SELECT** queries are allowed to be generated and executed via the Natural Language interface.
2. Direct SQL input is permitted for internal tools but should be used with caution.
3. Prevent SQL injection by strictly following the AI prompt instructions for query generation.

## Database Schema (CRITICAL FOR AI)
The AI uses the schema below to translate natural language into SQL. 
**INSTRUCTIONS:** Replace the placeholders below with your actual table names and columns.

### Tables Definition
```sql
-- Table: Users
-- Columns: Id, AboutMe, Age, CreationDate, DisplayName, DownVotes, EmailHash, LastAccessDate, Location, Reputation, UpVotes, Views, WebsiteUrl, AccountId

-- Table: Posts
-- Columns: Id, AcceptedAnswerId, AnswerCount, ClosedDate, CommentCount, CommunityOwnedDate, CreationDate, FavoriteCount, LastActivityDate, LastEditDate, LastEditorDisplayName, LastEditorUserId, OwnerUserId, ParentId, PostTypeId, Score, Title, ViewCount
-- FK: OwnerUserId -> Users.Id, PostTypeId -> PostTypes.Id

-- Table: Comments
-- Columns: Id, CreationDate, PostId, Score, UserId
-- FK: PostId -> Posts.Id, UserId -> Users.Id

-- Table: Badges
-- Columns: Id, Name, UserId, Date
-- FK: UserId -> Users.Id

-- Table: Tags
-- Columns: Id, TagName

-- Table: PostsToTags (This is the bridge table for Posts and Tags)
-- Columns: PostId, TagId
-- FK: PostId -> Posts.Id, TagId -> Tags.Id

-- Table: VoteTypes
-- Columns: Id, Name

-- Table: Votes
-- Columns: Id, PostId, BountyAmount, VoteTypeId, CreationDate
-- FK: PostId -> Posts.Id, VoteTypeId -> VoteTypes.Id

-- Table: PostTypes
-- Columns: Id, Type
```

## AI Prompting Instructions
- The AI must output **ONLY** the raw SQL query.
- No markdown code blocks (e.g., no ```sql ... ```).
- No explanations or conversational text.
- Target: Microsoft SQL Server (T-SQL).
