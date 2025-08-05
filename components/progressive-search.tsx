import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Upload, Sparkles, Filter, History, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressiveSearchProps {
  onSearch: (query: string) => void;
  onUpload?: () => void;
  className?: string;
}

export function ProgressiveSearch({ onSearch, onUpload, className }: ProgressiveSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recentQueries] = useState([
    "Show me the latest contracts",
    "What were our Q3 expenses?",
    "Analyze supplier performance"
  ]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setHasInteracted(true);
      onSearch(query);
      setSearchQuery('');
    }
  };

  const handleInputFocus = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  };

  const suggestedQueries = [
    "What's in my latest contracts?",
    "Show me expense reports from last quarter",
    "Analyze our best-performing products",
    "Compare supplier delivery times",
    "What are our payment terms?",
    "Show revenue trends by month"
  ];

  return (
    <div className={className}>
      {/* Main Search Bar */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleInputFocus}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            placeholder="Ask anything about your documents..."
            className="pl-10 pr-12 h-12 text-base rounded-xl border-2 focus:border-primary"
          />
          {searchQuery && (
            <Button
              onClick={() => handleSearch(searchQuery)}
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progressive Options */}
      <AnimatePresence>
        {hasInteracted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Quick Actions Row */}
            <div className="flex gap-2 flex-wrap">
              {onUpload && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onUpload}
                  className="h-9"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="h-9"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </div>

            {/* Suggested Queries */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Suggested Questions</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestedQueries.slice(0, showAdvanced ? 6 : 4).map((query, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors p-2 justify-start text-left h-auto"
                      onClick={() => handleSearch(query)}
                    >
                      {query}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Queries (if any) */}
            {recentQueries.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Recent Questions</span>
                  </div>
                  <div className="space-y-2">
                    {recentQueries.map((query, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => handleSearch(query)}
                      >
                        <span className="text-sm text-muted-foreground flex-1">{query}</span>
                        <Search className="h-3 w-3 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Advanced Options */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Advanced Options</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Badge variant="outline" className="cursor-pointer justify-center p-2">
                          📄 Contracts
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer justify-center p-2">
                          💰 Financial
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer justify-center p-2">
                          📊 Reports
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer justify-center p-2">
                          📧 Emails
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProgressiveSearch; 