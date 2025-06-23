# Memorify - Smart Diary App with AI Assistant, Voice Chat & Personalized Video Messages

A beautiful, emotionally intelligent diary app powered by Together.ai's advanced AI models (including Llama 3, Mixtral, and more) that helps users reflect on their day through conversational AI, voice interactions, and personalized AI-generated video messages.

## ✨ Features

### 🤖 AI-Powered Conversations
- **Advanced AI Models**: Chat with an empathetic AI companion using Together.ai's powerful models (Llama 3 70B, Mixtral 8x7B, and more)
- **Voice Chat Integration**: Real-time voice conversations with ElevenLabs Conversational AI
- **Intelligent Responses**: Context-aware responses that encourage deeper reflection

### 🎥 Personalized AI Video Messages
- **Tavus Integration**: Generate personalized AI video messages based on diary entries and emotional insights
- **Emotion-Responsive Videos**: Video tone, pace, and background adapt to detected emotions
- **Supportive Companion**: Videos feel like a caring friend providing empathetic feedback
- **Download & Replay**: Save and revisit your personalized video messages
- **Smart Fallbacks**: Inspirational quotes with emotion-colored backgrounds when video quota is exceeded

### 📝 Smart Diary Generation
- **Automatic Entry Creation**: Transform your conversations into beautifully written diary entries
- **Multiple Writing Styles**: AI generates entries in various tones (poetic, narrative, introspective, conversational)
- **Emotion Analysis**: Advanced emotion detection that visualizes your emotional journey
- **Photo Integration**: Attach photos to your diary entries for richer memories

### 🧠 Intelligent AI Companion
- **Proactive Check-ins**: AI reaches out based on patterns, milestones, and inactivity
- **Memory System**: AI remembers your patterns, preferences, and important moments
- **Weekly Insights**: Automated analysis of emotional patterns and growth observations
- **Personality Modes**: Choose from therapist, poet, coach, friend, or philosopher personalities
- **Milestone Tracking**: Celebrates journaling streaks and entry milestones

### 📊 Advanced Analytics
- **Timeline View**: Browse your reflections with emotion-colored cards, detailed analysis, and video messages
- **Calendar Integration**: Navigate through your emotional journey by date
- **Emotion Tracking**: Visual indicators and intensity measurements
- **Growth Insights**: AI-generated observations about your personal development

### 🔐 Security & Privacy
- **User Authentication**: Secure sign-up/sign-in with Supabase Auth
- **Database Storage**: All entries stored securely in Supabase PostgreSQL with Row Level Security
- **Data Encryption**: Your personal reflections are protected and private

### 🎨 Beautiful Design
- **Responsive Interface**: Modern, intuitive design that works on all devices
- **Smooth Animations**: Thoughtful micro-interactions and transitions
- **Emotion Colors**: Visual representation of emotions with custom color schemes
- **Apple-level Aesthetics**: Premium design with attention to detail

## 🚀 Setup Instructions

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

### 3. Configure Tavus API (Video Generation)

1. Get your Tavus API key from [Tavus](https://tavusapi.com/)
   - Sign up and create a replica for personalized video generation
   - Get your replica ID from the dashboard
2. Add Tavus credentials to your `.env` file:

```env
# Tavus API Configuration
VITE_TAVUS_API_KEY=your_tavus_api_key_here
VITE_TAVUS_REPLICA_ID=your_replica_id_here
```

3. Replace with your actual Tavus API key and replica ID

### 4. Configure Supabase (Database & Auth)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Add your Supabase credentials to the `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the database migrations to create the required tables:
   - Go to your Supabase dashboard → SQL Editor
   - Run the migration files from `supabase/migrations/` in order

### 5. Configure ElevenLabs Voice Chat (Optional)

The app includes ElevenLabs Conversational AI for voice interactions. The default agent ID is pre-configured, but you can:

1. Create your own agent at [ElevenLabs](https://elevenlabs.io/)
2. Update the agent ID in the VoiceChat component
3. Customize the voice personality and responses

### 6. Start the Development Server

```bash
npm run dev
```

## 📱 Usage Guide

### Getting Started
1. **Sign Up/Sign In**: Create an account or sign in to access your personal diary
2. **Start Chatting**: Click on the Chat tab and begin sharing your thoughts with the AI companion
3. **Voice Conversations**: Use the microphone button to start voice chats with the AI
4. **Add Photos**: Upload photos to your conversations for richer diary entries

### Creating Entries with Video Messages
1. **Chat with AI**: Have meaningful conversations about your day, feelings, and experiences
2. **Generate Entry**: Click "Generate Diary Entry" to transform your chat into a beautiful reflection
3. **Watch Video Message**: Each entry automatically generates a personalized AI video message
4. **Review Timeline**: Browse your emotional journey with video messages in the Timeline view
5. **Track Patterns**: Use the Calendar view to see your mood patterns over time

### AI Video Messages
1. **Automatic Generation**: Videos are created automatically based on your diary entries and emotions
2. **Emotion-Responsive**: Video tone, pace, and background adapt to your detected emotional state
3. **Personalized Content**: Each video feels like a supportive friend providing empathetic feedback
4. **Download & Save**: Save your favorite video messages for future viewing
5. **Fallback Mode**: When video quota is exceeded, receive beautiful inspirational quotes instead

### AI Companion Features
1. **Proactive Check-ins**: Your AI companion will reach out when it notices patterns or milestones
2. **Weekly Insights**: Generate comprehensive analysis of your emotional patterns and growth
3. **Personality Settings**: Customize your AI companion's personality and check-in frequency
4. **Memory System**: The AI learns your preferences and patterns over time

### Voice Chat
1. **Start Voice Chat**: Click the microphone button in the chat interface
2. **Natural Conversations**: Speak naturally with the AI companion
3. **Real-time Responses**: Get immediate voice responses powered by ElevenLabs
4. **Seamless Integration**: Voice conversations can be included in diary entries

## 🔧 API Integration Details

### Together.ai Integration

The app uses Together.ai's unified API for access to state-of-the-art AI models:

- **Available Models**: Llama 3 70B, Llama 3 8B, Mixtral 8x7B, Mistral 7B, and more
- **Conversational AI**: Empathetic responses that encourage deeper reflection
- **Diary Generation**: Transform conversations into thoughtful, first-person diary entries
- **Emotion Analysis**: Advanced emotion detection beyond simple keyword matching
- **Agent Features**: Proactive check-ins, weekly insights, and memory management

### Tavus Video Integration

- **Personalized Videos**: AI-generated video messages based on diary content and emotions
- **Emotion-Responsive**: Video style adapts to detected emotional state
- **Custom Backgrounds**: Different visual themes for different emotions
- **Adaptive Pacing**: Video speed and tone match emotional intensity
- **Fallback System**: Graceful degradation to inspirational quotes when quota exceeded

### ElevenLabs Voice Integration

- **Real-time Voice Chat**: Natural voice conversations with AI
- **Conversational AI Widget**: Embedded voice interface
- **Customizable Agents**: Configure personality and voice characteristics
- **Seamless Experience**: Voice chats integrate with text conversations

### Available AI Models

| Model | Description | Use Case |
|-------|-------------|----------|
| `meta-llama/Llama-3-70b-chat-hf` | Meta's most capable Llama 3 model | Complex conversations, diary generation |
| `meta-llama/Llama-3-8b-chat-hf` | Efficient Llama 3 model | Quick responses, emotion analysis |
| `mistralai/Mixtral-8x7B-Instruct-v0.1` | Mistral's powerful mixture of experts | Advanced reasoning, insights |
| `mistralai/Mistral-7B-Instruct-v0.1` | Mistral's efficient 7B model | Fast responses, check-ins |
| `NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO` | Fine-tuned Mixtral for conversations | Empathetic responses |
| `teknium/OpenHermes-2.5-Mistral-7B` | Optimized Mistral for dialogue | Natural conversations |

### Fallback System

If APIs are not configured, the app gracefully falls back to:
- Mock AI responses for demonstration
- Rule-based emotion analysis
- Template-based diary generation
- Inspirational quotes instead of videos
- Local storage for data persistence

## 🗄️ Database Schema

The app uses Supabase PostgreSQL with comprehensive tables:

### Core Tables
- **diary_entries**: Stores user diary entries with emotions, chat history, photos, and metadata
- **agent_memories**: AI memory system for patterns, preferences, milestones, and concerns
- **agent_checkins**: Proactive AI outreach messages and responses
- **weekly_insights**: Automated weekly emotional analysis and growth tracking
- **agent_settings**: User preferences for AI personality and behavior

### Security Features
- **Row Level Security**: Ensures users can only access their own data
- **Authentication**: Secure user management with Supabase Auth
- **Data Encryption**: All sensitive data is encrypted at rest
- **API Security**: Secure API endpoints with proper authentication

## 🌍 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_TOGETHER_API_KEY` | Your Together.ai API key | - | For AI features |
| `VITE_TOGETHER_MODEL` | Together.ai model to use | `meta-llama/Llama-3-70b-chat-hf` | No |
| `VITE_TOGETHER_MAX_TOKENS` | Maximum tokens per request | `1000` | No |
| `VITE_TOGETHER_TEMPERATURE` | Response creativity (0-1) | `0.7` | No |
| `VITE_TAVUS_API_KEY` | Your Tavus API key | - | For video generation |
| `VITE_TAVUS_REPLICA_ID` | Your Tavus replica ID | - | For video generation |
| `VITE_SUPABASE_URL` | Your Supabase project URL | - | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | - | Yes |

## 🔒 Security Notes

⚠️ **Important**: This implementation uses APIs directly from the browser for demonstration purposes. In a production environment, you should:

1. Create a backend API to handle external API requests
2. Store API keys securely on the server
3. Implement proper authentication and rate limiting
4. Use environment variables on the server side
5. Add request validation and sanitization
6. Implement proper error handling and logging

## 🏗️ Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## 🛠️ Technologies Used

### Frontend
- **React 18** with TypeScript for robust development
- **Tailwind CSS** for beautiful, responsive styling
- **Lucide React** for consistent iconography
- **Vite** for fast development and optimized builds

### AI & Voice
- **Together.ai API** for advanced AI models and conversations
- **Tavus API** for personalized AI video generation
- **ElevenLabs Conversational AI** for voice chat capabilities
- **Custom emotion analysis** with AI-powered insights

### Backend & Database
- **Supabase** for database, authentication, and real-time features
- **PostgreSQL** with Row Level Security for data protection
- **Automated migrations** for database schema management

### Features
- **Real-time updates** with Supabase subscriptions
- **Responsive design** with mobile-first approach
- **Progressive Web App** capabilities
- **Offline support** with local storage fallbacks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test with both API integrations and fallback modes
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Maintain responsive design principles
- Test all AI integrations thoroughly
- Ensure fallback modes work properly
- Add proper error handling
- Update documentation for new features

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- **Together.ai** for providing access to state-of-the-art AI models
- **Tavus** for revolutionary AI video generation technology
- **ElevenLabs** for revolutionary voice AI technology
- **Supabase** for the excellent backend-as-a-service platform
- **React & Tailwind** communities for amazing development tools
- **Bolt.new** for the incredible development platform

---

**Memorify** - Transform your thoughts into beautiful reflections with the power of AI and personalized video messages 🌟

*Built with ❤️ using [Bolt.new](https://bolt.new)*