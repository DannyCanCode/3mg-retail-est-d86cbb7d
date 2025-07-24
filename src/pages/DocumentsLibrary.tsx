import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  BookOpen,
  FileText,
  Download,
  Eye,
  Sparkles,
  Library,
  Users,
  Target,
  HandHeart,
  FileCheck,
  TrendingUp,
  Zap,
  Star,
  Rocket,
  Brain,
  Shield,
  Award,
  Layers
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  fileSize: string;
  lastUpdated: string;
  downloadCount: number;
  icon: React.ReactNode;
  gradient: string;
  glowColor: string;
  orbitRadius: number;
  orbitSpeed: number;
}

const DocumentsLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Document data with green theme
  const documents: Document[] = [
    // Who to Task? Documents
    {
      id: 'who-to-task-1',
      title: 'Territory Contact Matrix',
      description: 'Central Florida territory connections and specialists directory',
      category: 'Who to Task?',
      fileSize: '2.4 MB',
      lastUpdated: '2024-01-15',
      downloadCount: 247,
      icon: <Users className="h-6 w-6" />,
      gradient: 'from-emerald-600 via-green-600 to-teal-600',
      glowColor: 'rgba(34, 197, 94, 0.3)',
      orbitRadius: 250,
      orbitSpeed: 20
    },
    {
      id: 'who-to-task-2',
      title: 'Emergency Response Protocol',
      description: 'Quick escalation pathways for critical situations',
      category: 'Who to Task?',
      fileSize: '1.8 MB',
      lastUpdated: '2024-01-10',
      downloadCount: 156,
      icon: <Target className="h-6 w-6" />,
      gradient: 'from-green-600 via-emerald-600 to-cyan-600',
      glowColor: 'rgba(16, 185, 129, 0.3)',
      orbitRadius: 280,
      orbitSpeed: 25
    },

    // JWS Documents
    {
      id: 'jws-1',
      title: 'JWS Template 2024',
      description: 'Updated job worksheet with calculation guides',
      category: 'JWS',
      fileSize: '3.2 MB',
      lastUpdated: '2024-01-20',
      downloadCount: 892,
      icon: <FileCheck className="h-6 w-6" />,
      gradient: 'from-teal-600 via-cyan-600 to-blue-600',
      glowColor: 'rgba(20, 184, 166, 0.3)',
      orbitRadius: 300,
      orbitSpeed: 18
    },
    {
      id: 'jws-2',
      title: 'JWS Best Practices Guide',
      description: 'Step-by-step approach to worksheet optimization',
      category: 'JWS',
      fileSize: '4.1 MB',
      lastUpdated: '2024-01-18',
      downloadCount: 634,
      icon: <Brain className="h-6 w-6" />,
      gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
      glowColor: 'rgba(6, 182, 212, 0.3)',
      orbitRadius: 320,
      orbitSpeed: 22
    },

    // GAF Benefits Documents
    {
      id: 'gaf-1',
      title: 'GAF Warranty Overview',
      description: 'Complete guide to GAF warranty systems and coverage',
      category: 'GAF Benefits',
      fileSize: '5.7 MB',
      lastUpdated: '2024-01-22',
      downloadCount: 1247,
      icon: <Shield className="h-6 w-6" />,
      gradient: 'from-blue-600 via-indigo-600 to-purple-600',
      glowColor: 'rgba(59, 130, 246, 0.3)',
      orbitRadius: 270,
      orbitSpeed: 24
    },
    {
      id: 'gaf-2',
      title: 'Material Comparison Guide',
      description: 'Detailed analysis of GAF package differences',
      category: 'GAF Benefits',
      fileSize: '2.9 MB',
      lastUpdated: '2024-01-19',
      downloadCount: 543,
      icon: <Layers className="h-6 w-6" />,
      gradient: 'from-indigo-600 via-purple-600 to-pink-600',
      glowColor: 'rgba(99, 102, 241, 0.3)',
      orbitRadius: 290,
      orbitSpeed: 19
    },

    // Contracts Documents
    {
      id: 'contracts-1',
      title: 'Standard Contract Template',
      description: 'Pre-approved roofing agreement framework',
      category: 'Contracts',
      fileSize: '1.9 MB',
      lastUpdated: '2024-01-25',
      downloadCount: 387,
      icon: <FileText className="h-6 w-6" />,
      gradient: 'from-amber-600 via-orange-600 to-red-600',
      glowColor: 'rgba(251, 146, 60, 0.3)',
      orbitRadius: 310,
      orbitSpeed: 21
    },
    {
      id: 'contracts-2',
      title: 'Contract Amendment Guide',
      description: 'How to handle contract modifications properly',
      category: 'Contracts',
      fileSize: '1.2 MB',
      lastUpdated: '2024-01-23',
      downloadCount: 198,
      icon: <Award className="h-6 w-6" />,
      gradient: 'from-orange-600 via-red-600 to-pink-600',
      glowColor: 'rgba(251, 191, 36, 0.3)',
      orbitRadius: 260,
      orbitSpeed: 23
    },

    // Sales Advice Documents
    {
      id: 'sales-1',
      title: 'Objection Handling Guide',
      description: 'Proven responses for common customer concerns',
      category: 'Sales Advice',
      fileSize: '3.8 MB',
      lastUpdated: '2024-01-21',
      downloadCount: 721,
      icon: <HandHeart className="h-6 w-6" />,
      gradient: 'from-pink-600 via-rose-600 to-red-600',
      glowColor: 'rgba(236, 72, 153, 0.3)',
      orbitRadius: 285,
      orbitSpeed: 20
    },
    {
      id: 'sales-2',
      title: 'Closing Techniques Manual',
      description: 'Effective strategies for sales conversion',
      category: 'Sales Advice',
      fileSize: '4.5 MB',
      lastUpdated: '2024-01-17',
      downloadCount: 445,
      icon: <Rocket className="h-6 w-6" />,
      gradient: 'from-rose-600 via-pink-600 to-purple-600',
      glowColor: 'rgba(244, 114, 182, 0.3)',
      orbitRadius: 295,
      orbitSpeed: 17
    }
  ];

  const categories = [
    { 
      name: 'Who to Task?', 
      icon: <Users className="h-5 w-5" />, 
      color: 'green',
      description: 'Contact directory'
    },
    { 
      name: 'JWS', 
      icon: <Brain className="h-5 w-5" />, 
      color: 'teal',
      description: 'Job worksheets'
    },
    { 
      name: 'GAF Benefits', 
      icon: <Shield className="h-5 w-5" />, 
      color: 'blue',
      description: 'Product benefits'
    },
    { 
      name: 'Contracts', 
      icon: <Award className="h-5 w-5" />, 
      color: 'orange',
      description: 'Legal templates'
    },
    { 
      name: 'Sales Advice', 
      icon: <Rocket className="h-5 w-5" />, 
      color: 'pink',
      description: 'Sales strategies'
    }
  ];

  // Filter documents
  const filteredDocuments = activeFilter === 'all' 
    ? documents 
    : documents.filter(doc => doc.category === activeFilter);

  // Document Card Component
  const DocumentCard = ({ document, index }: { document: Document; index: number }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div
        className="relative group"
        style={{
          animation: `float ${5 + index}s ease-in-out infinite`,
          animationDelay: `${index * 0.2}s`
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Subtle glow effect */}
        <div 
          className={`absolute inset-0 rounded-2xl blur-xl transition-all duration-500 ${isHovered ? 'opacity-60 scale-105' : 'opacity-30'}`}
          style={{ background: document.glowColor }}
        />
        
        {/* Main card */}
        <div 
          className={`relative bg-gray-800/70 backdrop-blur-md border border-green-700/30 rounded-2xl transform transition-all duration-500 ${
            isHovered ? 'scale-105' : ''
          }`}
        >
          <div className="p-6 h-full">
            {/* Subtle shimmer */}
            <div className="absolute inset-0 rounded-2xl opacity-10 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1500" />
            
            {/* Icon container */}
            <div className="relative mb-4">
              <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${document.gradient} shadow-lg`}>
                {document.icon}
              </div>
            </div>
            
            {/* Content */}
            <h3 className="text-xl font-bold text-white mb-2">
              {document.title}
            </h3>
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{document.description}</p>
            
            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {document.fileSize}
              </span>
              <span>{new Date(document.lastUpdated).toLocaleDateString()}</span>
            </div>
            
            {/* Download counter */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Downloads</span>
                <span className="text-white font-bold">{document.downloadCount}</span>
              </div>
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${document.gradient} transition-all duration-1000`}
                  style={{ width: `${Math.min((document.downloadCount / 1500) * 100, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className={`flex-1 bg-gradient-to-r ${document.gradient} text-white border-0 hover:opacity-90 transition-all duration-300`}
                onClick={() => setSelectedDocument(document)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-green-700/50 text-green-300 hover:bg-green-900/30 hover:text-white hover:border-green-600 transition-all duration-300"
                onClick={() => {/* TODO: Download */}}
              >
                <Download className="h-4 w-4 mr-1" />
                Get
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Document Details Modal
  const DocumentModal = () => {
    if (!selectedDocument) return null;
    
    return (
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
        onClick={() => setSelectedDocument(null)}
      >
        <div 
          className="relative max-w-2xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal glow */}
          <div 
            className="absolute inset-0 rounded-3xl blur-2xl opacity-50"
            style={{ background: selectedDocument.glowColor }}
          />
          
          {/* Modal content */}
          <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-3xl p-8 border border-green-700/30">
            <div className="relative z-10">
              <div className="flex items-start gap-6 mb-6">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${selectedDocument.gradient} shadow-2xl`}>
                  {selectedDocument.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedDocument.title}</h2>
                  <p className="text-gray-400">{selectedDocument.description}</p>
                  
                  <div className="flex items-center gap-4 mt-4 text-sm">
                    <Badge className="bg-gray-800 text-gray-300 border-gray-700">
                      <Layers className="h-3 w-3 mr-1" />
                      {selectedDocument.fileSize}
                    </Badge>
                    <Badge className="bg-gray-800 text-gray-300 border-gray-700">
                      <Star className="h-3 w-3 mr-1" />
                      {selectedDocument.downloadCount} downloads
                    </Badge>
                    <Badge className="bg-gray-800 text-gray-300 border-gray-700">
                      Updated {new Date(selectedDocument.lastUpdated).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className={`bg-gradient-to-r ${selectedDocument.gradient} text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300`}
                  onClick={() => {/* TODO: View */}}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open Document
                </Button>
                <Button 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => {/* TODO: Download */}}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Animated background with green theme
  const AnimatedBackground = () => (
    <div className="fixed inset-0 overflow-hidden">
      {/* Dark background with green tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-green-900/40 to-emerald-900/30" />
      
      {/* Animated green clouds */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-[1000px] h-[1000px] bg-green-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-emerald-500/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-green-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>
      
      {/* Floating particles */}
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${3 + Math.random() * 7}s`
          }}
        />
      ))}
      
      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      {/* Animated background */}
      <AnimatedBackground />
      
      <div className="relative z-10 container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <Button 
            onClick={() => navigate('/sales')}
            variant="outline"
            className="mb-6 bg-green-950/40 backdrop-blur-sm border-green-800/50 text-green-300 hover:bg-green-900/50 hover:text-white hover:border-green-700 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Command Center
          </Button>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-4 mb-6">
              {/* Logo */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur-xl animate-pulse opacity-50" />
                <div className="relative p-4 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-2xl">
                  <Library className="h-12 w-12 text-white" />
                </div>
              </div>
              
              <h1 className="text-5xl font-bold text-white">
                3MG Documents
              </h1>
            </div>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Essential resources to help you succeed
            </p>
          </div>
          
          {/* Category filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <Button
              onClick={() => setActiveFilter('all')}
              className={`
                ${activeFilter === 'all' 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25' 
                  : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700'
                } 
                backdrop-blur-sm transition-all duration-300
              `}
            >
              <Layers className="h-4 w-4 mr-2" />
              All Documents
            </Button>
            
            {categories.map((category) => (
              <Button
                key={category.name}
                onClick={() => setActiveFilter(category.name)}
                onMouseEnter={() => setHoveredCategory(category.name)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`
                  ${activeFilter === category.name 
                    ? `bg-gradient-to-r ${
                        category.color === 'green' ? 'from-green-600 to-emerald-600' :
                        category.color === 'teal' ? 'from-teal-600 to-cyan-600' :
                        category.color === 'blue' ? 'from-blue-600 to-indigo-600' :
                        category.color === 'orange' ? 'from-orange-600 to-amber-600' :
                        'from-pink-600 to-rose-600'
                      } text-white shadow-lg` 
                    : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700'
                  } 
                  backdrop-blur-sm transition-all duration-300 relative overflow-hidden
                `}
              >
                {/* Subtle hover effect */}
                {hoveredCategory === category.name && activeFilter !== category.name && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shimmer" />
                )}
                {category.icon}
                <span className="ml-2">{category.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Document Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {filteredDocuments.map((document, index) => (
            <DocumentCard key={document.id} document={document} index={index} />
          ))}
        </div>

        {/* Stats Dashboard */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-3xl blur-xl" />
          <div className="relative bg-gray-800/70 backdrop-blur-xl rounded-3xl p-8 border border-green-700/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400">
                  {documents.length}
                </div>
                <div className="text-gray-400 mt-1">Total Documents</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-400">
                  {categories.length}
                </div>
                <div className="text-gray-400 mt-1">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-teal-400">
                  {documents.reduce((sum, doc) => sum + doc.downloadCount, 0).toLocaleString()}
                </div>
                <div className="text-gray-400 mt-1">Total Downloads</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 animate-pulse">
                  ONLINE
                </div>
                <div className="text-gray-400 mt-1">System Status</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Modal */}
      <DocumentModal />
    </div>
  );
};

export default DocumentsLibrary; 