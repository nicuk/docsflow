"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { INDUSTRY_PRESETS } from '@/lib/persona-prompt-generator';

interface PersonaData {
  industry: string;
  custom_instructions: string;
}

interface PersonaEditorProps {
  currentPersona?: PersonaData;
  tenantId: string;
  onPersonaUpdated?: (persona: PersonaData) => void;
}

export default function PersonaEditor({ currentPersona, tenantId, onPersonaUpdated }: PersonaEditorProps) {
  const [persona, setPersona] = useState<PersonaData>({
    industry: 'general',
    custom_instructions: INDUSTRY_PRESETS.general.default_instructions
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (currentPersona) {
      setPersona(currentPersona);
    } else {
      fetchCurrentPersona();
    }
  }, [currentPersona]);

  const fetchCurrentPersona = async () => {
    try {
      const response = await fetch('/api/tenant/persona', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.persona) {
          setPersona({
            industry: data.persona.industry || 'general',
            custom_instructions: data.persona.custom_instructions || INDUSTRY_PRESETS[data.persona.industry || 'general']?.default_instructions || INDUSTRY_PRESETS.general.default_instructions
          });
        }
      }
    } catch {
      // Failed to fetch current persona
    }
  };

  const handleIndustryChange = (industry: string) => {
    const preset = INDUSTRY_PRESETS[industry] || INDUSTRY_PRESETS.general;
    setPersona({
      industry,
      custom_instructions: preset.default_instructions
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      const response = await fetch('/api/tenant/persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          industry: persona.industry,
          custom_instructions: persona.custom_instructions
        })
      });

      if (response.ok) {
        setSaveStatus('success');
        onPersonaUpdated?.(persona);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update persona');
      }
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Configuration
            </CardTitle>
            <CardDescription>
              Choose your industry for smart defaults, then customize the instructions to fit your needs.
            </CardDescription>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
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
        
        {saveStatus !== 'idle' && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            saveStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {saveStatus === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {saveStatus === 'success' ? 'AI configuration updated successfully!' : 'Failed to update configuration'}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <p className="text-sm text-muted-foreground">
            Selecting an industry pre-fills smart defaults. You can customize them below.
          </p>
          <Select value={persona.industry} onValueChange={handleIndustryChange}>
            <SelectTrigger id="industry">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Custom Instructions</Label>
          <p className="text-sm text-muted-foreground">
            Tell the AI who it is, what to focus on, and how to respond. These instructions are used every time users ask questions about their documents.
          </p>
          <Textarea
            id="instructions"
            value={persona.custom_instructions}
            onChange={(e) => setPersona({ ...persona, custom_instructions: e.target.value })}
            placeholder="You are a document intelligence assistant specialized in..."
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground text-right">
            {persona.custom_instructions?.length || 0} / 2000 characters
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-1">Built-in safeguards (always active):</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Answers are based only on uploaded documents</li>
            <li>Sources are cited for every factual claim</li>
            <li>The AI will say when it doesn't have enough information</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
