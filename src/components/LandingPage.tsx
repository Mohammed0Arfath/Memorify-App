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
  ArrowRight,
  Play,
  CheckCircle,
  Star,
  ExternalLink
} from 'lucide-react';
import Spline from '@splinetool/react-spline';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../hooks/useTheme';

interface LandingPageProps {
  onNavigateToAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth }) => {
  const { isDark } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    // Loading animation
    setTimeout(() => setIsLoaded(true), 500);
  }, []);

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
    <div className="min-h-screen transition-colors duration-500">
      {/* Enhanced Background for Dark Mode */}
      <div className="fixed inset-0 bg-gray-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-500"></div>
      
      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 dark:from-slate-900 dark:via-purple-900/20 dark:to-indigo-900/20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20 dark:opacity-10"></div>
          
          {/* Enhanced Floating Orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 dark:bg-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 dark:bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/20 dark:bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          
          {/* Additional Dark Mode Orbs */}
          <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-cyan-500/10 dark:bg-cyan-400/5 rounded-full blur-2xl animate-pulse delay-2000"></div>
          <div className="absolute bottom-1/3 left-1/3 w-72 h-72 bg-pink-500/10 dark:bg-pink-400/5 rounded-full blur-3xl animate-pulse delay-3000"></div>
        </div>

        {/* 3D AI Bot */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-96 h-96 opacity-80 dark:opacity-60">
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
            {/* Enhanced Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-slate-800/50 backdrop-blur-sm rounded-full border border-white/20 dark:border-slate-700/50 text-white/90 dark:text-slate-200 text-sm font-medium mb-8 shadow-lg dark:shadow-2xl">
              <Sparkles className="w-4 h-4" />
              AI-Powered Emotional Intelligence
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold text-white dark:text-slate-100 mb-6 leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 dark:from-purple-300 dark:via-pink-300 dark:to-blue-300 bg-clip-text text-transparent">
                Memorify
              </span>
              <br />
              <span className="text-3xl md:text-5xl font-medium text-white/90 dark:text-slate-200">
                Your AI-Powered Emotional Diary
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-white/80 dark:text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              <span className="font-semibold text-purple-300 dark:text-purple-200">Reflect.</span>{' '}
              <span className="font-semibold text-pink-300 dark:text-pink-200">Record.</span>{' '}
              <span className="font-semibold text-blue-300 dark:text-blue-200">Reconnect.</span>
              <br />
              Transform your thoughts into meaningful insights with an AI companion that truly understands you.
            </p>

            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button
                onClick={onNavigateToAuth}
                className="group px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 text-white font-semibold rounded-2xl shadow-2xl hover:shadow-purple-500/25 dark:hover:shadow-purple-400/30 transition-all duration-300 hover:scale-105 flex items-center gap-3"
              >
                <Sparkles className="w-5 h-5" />
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={scrollToFeatures}
                className="group px-8 py-4 bg-white/10 dark:bg-slate-800/50 backdrop-blur-sm text-white dark:text-slate-200 font-semibold rounded-2xl border border-white/20 dark:border-slate-700/50 hover:bg-white/20 dark:hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 flex items-center gap-3 shadow-lg dark:shadow-2xl"
              >
                <Play className="w-5 h-5" />
                Explore Features
              </button>
            </div>

            {/* Enhanced Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center p-4 rounded-2xl bg-white/5 dark:bg-slate-800/30 backdrop-blur-sm border border-white/10 dark:border-slate-700/30">
                <div className="text-3xl font-bold text-white dark:text-slate-100 mb-2">10K+</div>
                <div className="text-white/70 dark:text-slate-400">Reflections Created</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/5 dark:bg-slate-800/30 backdrop-blur-sm border border-white/10 dark:border-slate-700/30">
                <div className="text-3xl font-bold text-white dark:text-slate-100 mb-2">95%</div>
                <div className="text-white/70 dark:text-slate-400">User Satisfaction</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/5 dark:bg-slate-800/30 backdrop-blur-sm border border-white/10 dark:border-slate-700/30">
                <div className="text-3xl font-bold text-white dark:text-slate-100 mb-2">24/7</div>
                <div className="text-white/70 dark:text-slate-400">AI Companion</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 dark:border-slate-400/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 dark:bg-slate-400/50 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="relative py-24 bg-white dark:bg-slate-800/50 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6">
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-slate-100 mb-6">
              Powerful Features for
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent"> Emotional Growth</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
              Discover how Memorify combines cutting-edge AI technology with emotional intelligence to create the most advanced journaling experience.
            </p>
          </div>

          {/* Enhanced Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`group p-8 rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-800/50 dark:backdrop-blur-sm hover:shadow-2xl dark:hover:shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer border border-gray-200/50 dark:border-slate-600/30 ${
                    activeFeature === index ? 'ring-2 ring-purple-500 dark:ring-purple-400' : ''
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section className="relative py-24 bg-gray-50 dark:bg-slate-900/50 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-slate-100 mb-6">
              Loved by Thousands
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-300">
              See what our users say about their journey with Memorify
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 bg-white dark:bg-slate-800/50 dark:backdrop-blur-sm rounded-3xl shadow-lg hover:shadow-2xl dark:hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-200/50 dark:border-slate-700/30"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <p className="text-gray-600 dark:text-slate-300 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>
                
                <div>
                  <div className="font-semibold text-gray-900 dark:text-slate-100">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="relative py-24 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-700 dark:via-pink-700 dark:to-blue-700">
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
              className="group px-10 py-5 bg-white dark:bg-slate-100 text-purple-600 dark:text-purple-700 font-bold rounded-2xl shadow-2xl hover:shadow-white/25 transition-all duration-300 hover:scale-105 flex items-center gap-3"
            >
              <Heart className="w-6 h-6" />
              Start Your Journey
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-white/70 dark:text-white/80">
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

      {/* Enhanced Footer with Developer Links */}
      <footer className="relative py-12 bg-gray-900 dark:bg-slate-950 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Logo and Description */}
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">Memorify</div>
                <div className="text-sm text-gray-400 dark:text-slate-500">AI-Powered Emotional Diary</div>
              </div>
            </div>

            {/* Developer Links */}
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/Mohammed0Arfath/Memorify-App"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 p-2 text-gray-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-200 transition-all duration-300 hover:scale-110"
                aria-label="GitHub Repository"
              >
                <Github className="w-5 h-5" />
                <span className="hidden sm:block text-sm group-hover:text-purple-300 transition-colors">GitHub</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a
                href="https://www.linkedin.com/in/mohammed-arfath-r"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 p-2 text-gray-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-200 transition-all duration-300 hover:scale-110"
                aria-label="LinkedIn Profile"
              >
                <Linkedin className="w-5 h-5" />
                <span className="hidden sm:block text-sm group-hover:text-blue-300 transition-colors">LinkedIn</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a
                href="https://heroic-clafoutis-6f1eee.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 p-2 text-gray-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-200 transition-all duration-300 hover:scale-110"
                aria-label="Portfolio Website"
              >
                <Globe className="w-5 h-5" />
                <span className="hidden sm:block text-sm group-hover:text-green-300 transition-colors">Portfolio</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>

          <div className="border-t border-gray-800 dark:border-slate-800 mt-8 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-400 dark:text-slate-500">
              <div className="mb-4 md:mb-0 text-center md:text-left">
                <div className="mb-2">
                  © 2025 Memorify. All rights reserved.
                </div>
                <div className="text-xs">
                  Developed by{' '}
                  <a
                    href="https://www.linkedin.com/in/mohammed-arfath-r"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 dark:text-purple-300 hover:text-purple-300 dark:hover:text-purple-200 transition-colors duration-300 font-medium"
                  >
                    Mohammed Arfath R
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2 text-center md:text-right">
                <span>Built with</span>
                <a
                  href="https://bolt.new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 dark:text-purple-300 hover:text-purple-300 dark:hover:text-purple-200 transition-colors duration-300 flex items-center gap-1 font-medium"
                >
                  <Zap className="w-4 h-4" />
                  Bolt.new
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};