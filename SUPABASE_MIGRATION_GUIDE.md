# 🚀 Supabase Migration Guide for Memorify

## Step-by-Step Migration Process

### 1. 🗄️ Set Up New Supabase Project Schema

1. **Go to your new Supabase project dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste the entire contents of `supabase/migrations/fresh_start_schema.sql`**
4. **Run the migration** - This will create all tables with proper RLS policies

### 2. 🔑 Update Environment Variables

1. **In your new Supabase project:**
   - Go to Settings → API
   - Copy the **Project URL** 
   - Copy the **anon/public key**

2. **Update your local `.env` file:**
   ```env
   VITE_SUPABASE_URL=https://your-new-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your_new_anon_key_here
   ```

3. **Update Netlify environment variables:**
   - Go to your Netlify dashboard
   - Navigate to Site settings → Environment variables
   - Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### 3. ✅ Verify Schema Creation

After running the migration, verify these tables exist:
- ✅ `diary_entries` - Core diary functionality
- ✅ `agent_memories` - AI memory system  
- ✅ `agent_checkins` - Proactive AI outreach
- ✅ `weekly_insights` - Weekly emotional analysis
- ✅ `agent_settings` - User AI preferences

### 4. 🧪 Test the Application

1. **Sign up with a new account** (fresh start)
2. **Test core features:**
   - ✅ User authentication (sign up/sign in)
   - ✅ Chat interface with AI companion
   - ✅ Diary entry generation
   - ✅ Emotion analysis
   - ✅ Timeline view
   - ✅ Calendar view
   - ✅ AI Companion board

### 5. 🚀 Deploy Updated App

The app is already configured to work with the new Supabase instance once you update the environment variables.

## 🔧 Troubleshooting

### If you get authentication errors:
- Double-check your Supabase URL and anon key
- Ensure RLS policies are enabled (they should be from the migration)

### If tables don't exist:
- Re-run the migration SQL in Supabase SQL Editor
- Check for any error messages in the SQL Editor

### If the app doesn't load:
- Check browser console for errors
- Verify environment variables are set correctly
- Ensure Netlify has the updated env vars

## 🎯 Success Checklist

- [ ] New Supabase project created
- [ ] Migration SQL executed successfully
- [ ] All 5 tables created with RLS enabled
- [ ] Local `.env` updated with new credentials
- [ ] Netlify environment variables updated
- [ ] App deployed and working
- [ ] User can sign up and create diary entries
- [ ] AI features working (chat, emotion analysis)
- [ ] No console errors

## 🆘 Need Help?

If you encounter any issues:
1. Check the browser console for specific error messages
2. Verify your Supabase project is active and not paused
3. Ensure all environment variables are correctly set
4. Test the Supabase connection in the Network tab

Your Memorify app should be back up and running with the fresh Supabase backend! 🎉