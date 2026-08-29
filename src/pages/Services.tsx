import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Church } from 'lucide-react';
import { useServices } from '../hooks/useServices';
import { usePageView } from '../hooks/useAnalytics';
import { usePageTitle } from '../hooks/usePageTitle';

const SERVICE_GROUPS = [
  {
    title: 'Weekly Services',
    ids: ['morning_service', 'seekers_service', 'mercy_day_service', 'power_day_service', 'evening_service_lords_day', 'lords_day_service']
  },
  {
    title: 'Monthly',
    ids: ['new_moon']
  },
  {
    title: 'Life Events',
    ids: ['baby_christening', 'birthday', 'holy_matrimony', 'baptism']
  },
  {
    title: 'Special Occasions',
    ids: ['prophets_prophetess_dreamers', 'pregnant_women', 'washing_feet_communion', 'laying_foundation_stone', 'private_house_dedication', 'church_dedication']
  },
  {
    title: 'Remembrance',
    ids: ['christian_wake', 'burial', 'remembrance', 'end_of_year']
  }
];

export default function Services() {
  usePageView('services');
  usePageTitle('services');
  const { services, loading } = useServices();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!searchTerm) return services;
    return services.filter(s => 
      s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [services, searchTerm]);

  if (loading) return <div className="p-4 text-center text-[var(--color-text-secondary)]">Loading...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-6 font-outfit">Service Directory</h1>
      
      <div className="mb-8 relative">
        <input 
          type="text" 
          placeholder="Search services..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl py-3 px-4 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-gold)] transition-colors placeholder:text-[var(--color-text-secondary)] backdrop-blur-md"
        />
      </div>

      <div className="space-y-10">
        {SERVICE_GROUPS.map(group => {
          const groupServices = filteredServices.filter(s => group.ids.includes(s.id));
          if (groupServices.length === 0) return null;

          return (
            <div key={group.title}>
              <h2 className="text-xl font-semibold text-[var(--color-accent-gold)] mb-4 font-outfit">{group.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupServices.map(service => (
                  <button 
                    key={service.id}
                    onClick={() => navigate(`/services/${service.id}`)}
                    className="flex flex-col text-left bg-[var(--color-bg-card)]/80 hover:bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-accent-gold)]/50 rounded-2xl p-5 transition-all duration-300 backdrop-blur-sm group shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-2 w-full">
                      <Church size={24} style={{ color: 'var(--color-accent-brand)' }} />
                      <span className="text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-2 py-1 rounded-full group-hover:text-[var(--color-accent-gold)] transition-colors">
                        {service.day}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-1 font-outfit">{service.displayName}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">{service.time}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
