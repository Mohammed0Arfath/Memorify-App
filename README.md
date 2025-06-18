# Memorify - Smart Diary App with AI Assistant

A beautiful, emotionally intelligent diary app powered by Together.ai's advanced AI models (including Llama 3, Mixtral, and more) that helps users reflect on their day through conversational AI.

## Features

- **AI-Powered Conversations**: Chat with an empathetic AI companion using Together.ai's powerful models (Llama 3 70B, Mixtral 8x7B, and more)
- **Automatic Diary Generation**: Transform your conversations into beautifully written diary entries
- **Emotion Analysis**: Advanced emotion detection that visualizes your emotional journey
- **Timeline View**: Browse your reflections with emotion-colored cards and detailed analysis
- **Calendar Integration**: Navigate through your emotional journey by date
- **Photo Upload**: Attach photos to your diary entries for richer memories
- **User Authentication**: Secure sign-up/sign-in with Supabase Auth
- **Database Storage**: All entries stored securely in Supabase PostgreSQL
- **Responsive Design**: Beautiful, modern interface that works on all devices

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Together.ai API

1. Get your Together.ai API key from [Together.ai](https://api.together.xyz/)
   - Sign up and add credits to access premium models like Llama 3 70B and Mixtral 8x7B
   - Free tier available with rate limits
2. Create a `.env` file in the root directory:

```env
# Together.ai API Configuration
VITE_TOGETHER_API_KEY=your_together_api_key_here

# Optional: Custom Together.ai settings
VITE_TOGETHER_MODEL=meta-llama/Llama-3-70b-chat-hf
VITE_TOGETHER_MAX_TOKENS=1000
VITE_TOGETHER_TEMPERATURE=0.7
```

3. Replace `your_together_api_key_here` with your actual Together.ai API key

### 3. Configure Supabase (Database & Auth)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Add your Supabase credentials to the `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the database migration to create the required tables:
   - Go to your Supabase dashboard → SQL Editor
   - Run the migration file from `supabase/migrations/`

### 4. Start the Development Server

```bash
npm run dev
```

## Usage

1. **Sign Up/Sign In**: Create an account or sign in to access your personal diary
2. **Start a Conversation**: Click on the Chat tab and begin sharing your thoughts with the AI companion
3. **Upload Photos**: Add photos to your conversations for richer diary entries
4. **Generate Diary Entry**: After chatting, click "Generate Diary Entry" to create a beautiful reflection
5. **View Timeline**: Browse your emotional journey in the Timeline view
6. **Calendar Navigation**: Use the Calendar view to see your mood patterns over time
7. **Sign Out**: Use the user menu in the top right to sign out when done

## API Integration Details

### Together.ai Integration

The app uses Together.ai's unified API for access to state-of-the-art AI models:

- **Available Models**: Llama 3 70B, Llama 3 8B, Mixtral 8x7B, Mistral 7B, and more
- **Conversational AI**: Empathetic responses that encourage deeper reflection
- **Diary Generation**: Transform conversations into thoughtful, first-person diary entries
- **Emotion Analysis**: Advanced emotion detection beyond simple keyword matching

### Available Models

| Model | Description |
|-------|-------------|
| `meta-llama/Llama-3-70b-chat-hf` | Meta's most capable Llama 3 model |
| `meta-llama/Llama-3-8b-chat-hf` | Efficient Llama 3 model |
| `mistralai/Mixtral-8x7B-Instruct-v0.1` | Mistral's powerful mixture of experts model |
| `mistralai/Mistral-7B-Instruct-v0.1` | Mistral's efficient 7B model |
| `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO` | Fine-tuned Mixtral for conversations |
| `teknium/OpenHermes-2.5-Mistral-7B` | Optimized Mistral for dialogue |

### Fallback System

If the Together.ai API key is not configured, the app gracefully falls back to:
- Mock AI responses for demonstration
- Rule-based emotion analysis
- Template-based diary generation

## Database Schema

The app uses Supabase PostgreSQL with the following main table:

- **diary_entries**: Stores user diary entries with emotions, chat history, photos, and metadata
- **Row Level Security**: Ensures users can only access their own data
- **Real-time subscriptions**: Future feature for live updates

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_TOGETHER_API_KEY` | Your Together.ai API key | Required for AI features |
| `VITE_TOGETHER_MODEL` | Together.ai model to use | `meta-llama/Llama-3-70b-chat-hf` |
| `VITE_TOGETHER_MAX_TOKENS` | Maximum tokens per request | `1000` |
| `VITE_TOGETHER_TEMPERATURE` | Response creativity (0-1) | `0.7` |
| `VITE_SUPABASE_URL` | Your Supabase project URL | Required |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Required |

## Security Notes

⚠️ **Important**: This implementation uses the Together.ai API directly from the browser for demonstration purposes. In a production environment, you should:

1. Create a backend API to handle Together.ai requests
2. Store API keys securely on the server
3. Implement proper authentication and rate limiting
4. Use environment variables on the server side

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## Technologies Used

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Together.ai API** for advanced AI models
- **Supabase** for database and authentication
- **Lucide React** for icons
- **Vite** for development and building

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both Together.ai API and fallback modes
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.