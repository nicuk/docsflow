"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Brain, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface PersonaData {
  role: string;
  tone: string;
  focus_areas: string[];
  business_context: string;
  prompt_template: string;
  industry: string;
  created_from: string;
}

interface PersonaEditorProps {
  currentPersona?: PersonaData;
  tenantId: string;
  onPersonaUpdated?: (persona: PersonaData) => void;
}

export default function PersonaEditor({ currentPersona, tenantId, onPersonaUpdated }: PersonaEditorProps) {
  const [persona, setPersona] = useState<PersonaData>({
    role: 'Business Intelligence Assistant',
    tone: 'Professional and helpful',
    focus_areas: ['document analysis', 'business insights', 'decision support'],
    business_context: 'AI-powered business intelligence',
    prompt_template: 'You are an AI assistant focused on providing helpful, accurate information.',
    industry: 'general',
    created_from: 'manual_edit'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [newFocusArea, setNewFocusArea] = useState('');

  useEffect(() => {
    if (currentPersona) {
      setPersona(currentPersona);
    }
  }, [currentPersona]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ai-lead-router-saas.vercel.app/api';
      const response = await fetch(`${apiUrl}/tenant/update-persona`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          customPersona: persona
        })
      });

      if (response.ok) {
        setSaveStatus('success');
        onPersonaUpdated?.(persona);
        console.log('✅ Persona updated successfully');
      } else {
        throw new Error('Failed to update persona');
      }
    } catch (error) {
      console.error('Persona update error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsGenerating(true);
    setSaveStatus('idle');
    
    try {
      // Use current business context to regenerate persona
      const prompt = `
        Regenerate an AI assistant persona for this business:
        Industry: ${persona.industry}
        Business Context: ${persona.business_context}
        Current Role: ${persona.role}
        
        Create a fresh, optimized persona that maintains the business context but improves the AI's effectiveness.
      `;
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ai-lead-router-saas.vercel.app/api';
      const response = await fetch(`${apiUrl}/tenant/regenerate-persona`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          prompt,
          currentPersona: persona
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.persona) {
          setPersona({ ...result.persona, created_from: 'regenerated' });
          setSaveStatus('success');
          console.log('✅ Persona regenerated successfully');
        }
      } else {
        throw new Error('Failed to regenerate persona');
      }
    } catch (error) {
      console.error('Persona regeneration error:', error);
      setSaveStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const addFocusArea = () => {
    if (newFocusArea.trim() && !persona.focus_areas.includes(newFocusArea.trim())) {
      setPersona({
        ...persona,
        focus_areas: [...persona.focus_areas, newFocusArea.trim()]
      });
      setNewFocusArea('');
    }
  };

  const removeFocusArea = (area: string) => {
    setPersona({
      ...persona,
      focus_areas: persona.focus_areas.filter(fa => fa !== area)
    });
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Persona Editor
            </CardTitle>
            <CardDescription>
              Customize your organization's AI assistant personality and behavior
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRegenerate}
              disabled={isGenerating || isSaving}
              variant="outline"
              size="sm"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isGenerating}
              size="sm"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
        
        {saveStatus !== 'idle' && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            saveStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {saveStatus === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {saveStatus === 'success' ? 'Persona updated successfully!' : 'Failed to update persona'}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Role */}
        <div className="space-y-2">
          <Label htmlFor="role">AI Role</Label>
          <Input
            id="role"
            value={persona.role}
            onChange={(e) => setPersona({ ...persona, role: e.target.value })}
            placeholder="e.g., Business Intelligence Assistant"
          />
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label htmlFor="tone">Communication Tone</Label>
          <Input
            id="tone"
            value={persona.tone}
            onChange={(e) => setPersona({ ...persona, tone: e.target.value })}
            placeholder="e.g., Professional and helpful"
          />
        </div>

        {/* Business Context */}
        <div className="space-y-2">
          <Label htmlFor="context">Business Context</Label>
          <Textarea
            id="context"
            value={persona.business_context}
            onChange={(e) => setPersona({ ...persona, business_context: e.target.value })}
            placeholder="Describe your business context..."
            rows={3}
          />
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            value={persona.industry}
            onChange={(e) => setPersona({ ...persona, industry: e.target.value })}
            placeholder="e.g., healthcare, manufacturing, retail"
          />
        </div>

        {/* Focus Areas */}
        <div className="space-y-2">
          <Label>Focus Areas</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {persona.focus_areas.map((area, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-red-100"
                onClick={() => removeFocusArea(area)}
              >
                {area} ×
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newFocusArea}
              onChange={(e) => setNewFocusArea(e.target.value)}
              placeholder="Add focus area..."
              onKeyPress={(e) => e.key === 'Enter' && addFocusArea()}
            />
            <Button onClick={addFocusArea} size="sm" variant="outline">
              Add
            </Button>
          </div>
        </div>

        {/* Prompt Template */}
        <div className="space-y-2">
          <Label htmlFor="prompt">Custom Prompt Template</Label>
          <Textarea
            id="prompt"
            value={persona.prompt_template}
            onChange={(e) => setPersona({ ...persona, prompt_template: e.target.value })}
            placeholder="You are an AI assistant that..."
            rows={4}
          />
        </div>

        {/* Metadata */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="text-sm text-muted-foreground">
            <strong>Created from:</strong> {persona.created_from}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}