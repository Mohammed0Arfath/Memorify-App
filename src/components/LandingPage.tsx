import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  MessageCircle, 
  Brain, 
  TrendingUp, 
  Mic, 
  Calendar,
  Heart,
  Zap,
  Github,
  Linkedin,
  Globe,
  Moon,
  Sun,
  ArrowRight,
  Play,
  CheckCircle,
  Star
} from 'lucide-react';
import Spline from '@splinetool/react-spline';

interface LandingPageProps {
  onNavigateToAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth }) => {
  const [darkMode, setDarkMode] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('memorify-theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }
    
    // Apply theme to document
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('memorify-theme', darkMode ? 'dark' : 'light');
    
    // Loading animation
    setTimeout(() => setIsLoaded(true), 500);
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      icon: MessageCircle,
      title: "Emotional-Aware AI Chat",
      description: "Engage in meaningful conversations with an AI companion that understands and responds to your emotional state with empathy and insight.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Brain,
      title: "Intelligent Diary Generation",
      description: "Transform your conversations into beautifully written diary entries that capture your thoughts, feelings, and personal growth journey.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: TrendingUp,
      title: "Mood Insights & Analytics",
      description: "Discover patterns in your emotional journey with weekly insights, mood trends, and personalized growth observations.",
      color: "from-emerald-500 to-teal-500"
    },
    {
      icon: Mic,
      title: "Voice Conversations",
      description: "Experience natural voice interactions with your AI companion powered by ElevenLabs' advanced conversational AI technology.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Sparkles,
      title: "Agentic AI Companion",
      description: "Your AI adapts to your personality preferences - choose from therapist, poet, coach, friend, or philosopher modes.",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Calendar,
      title: "Timeline & Calendar Views",
      description: "Navigate through your emotional journey with beautiful timeline and calendar interfaces that make reflection effortless.",
      color: "from-pink-500 to-rose-500"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Mental Health Advocate",
      content: "Memorify has transformed how I process my emotions. The AI companion feels genuinely caring and helps me discover insights I never would have found on my own.",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "Startup Founder",
      content: "As someone who struggles with traditional journaling, Memorify's conversational approach makes reflection feel natural and engaging. The weekly insights are incredibly valuable.",
      rating: 5
    },
    {
      name: "Dr. Emily Watson",
      role: "Therapist",
      content: "I recommend Memorify to my clients as a complement to therapy. The emotional awareness and pattern recognition help them develop better self-understanding.",
      rating: 5
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-110"
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-700" />
          )}
        </button>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
          
          {/* Floating Orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        {/* 3D AI Bot */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-96 h-96 opacity-80">
              <Spline
                scene="https://prod.spline.design/aB5a6sVScaHOTWjC/scene.splinecode"
                onLoad={() => setIsLoaded(true)}
              />
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <div className={`transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-white/90 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              AI-Powered Emotional Intelligence
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Memorify
              </span>
              <br />
              <span className="text-3xl md:text-5xl font-medium text-white/90">
                Your AI-Powered Emotional Diary
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
              <span className="font-semibold text-purple-300">Reflect.</span>{' '}
              <span className="font-semibold text-pink-300">Record.</span>{' '}
              <span className="font-semibold text-blue-300">Reconnect.</span>
              <br />
              Transform your thoughts into meaningful insights with an AI companion that truly understands you.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button
                onClick={onNavigateToAuth}
                className="group px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-2xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 flex items-center gap-3"
              >
                <Sparkles className="w-5 h-5" />
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={scrollToFeatures}
                className="group px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 flex items-center gap-3"
              >
                <Play className="w-5 h-5" />
                Explore Features
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">10K+</div>
                <div className="text-white/70">Reflections Created</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">95%</div>
                <div className="text-white/70">User Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-white/70">AI Companion</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-gray-800 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Powerful Features for
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> Emotional Growth</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Discover how Memorify combines cutting-edge AI technology with emotional intelligence to create the most advanced journaling experience.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`group p-8 rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer ${
                    activeFeature === index ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Loved by Thousands
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              See what our users say about their journey with Memorify
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
            Join thousands of users who have discovered deeper self-awareness and emotional growth through AI-powered reflection.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onNavigateToAuth}
              className="group px-10 py-5 bg-white text-purple-600 font-bold rounded-2xl shadow-2xl hover:shadow-white/25 transition-all duration-300 hover:scale-105 flex items-center gap-3"
            >
              <Heart className="w-6 h-6" />
              Start Your Journey
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-white/70">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Free to start</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Privacy focused</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 dark:bg-black transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Logo and Description */}
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">Memorify</div>
                <div className="text-sm text-gray-400">AI-Powered Emotional Diary</div>
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-white transition-colors duration-300 hover:scale-110"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-white transition-colors duration-300 hover:scale-110"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://netlify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-white transition-colors duration-300 hover:scale-110"
                aria-label="Netlify"
              >
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
            <div className="mb-4 md:mb-0">
              © 2025 Memorify. All rights reserved.
            </div>
            <div className="flex items-center gap-2">
              Built with
              <a
                href="https://bolt.new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 transition-colors duration-300 flex items-center gap-1"
              >
                <Zap className="w-4 h-4" />
                Bolt.new
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};