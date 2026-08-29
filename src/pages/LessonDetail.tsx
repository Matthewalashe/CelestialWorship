import { useParams, Link } from 'react-router-dom';
import { useLessonsByDate } from '../hooks/useLessons';
import { usePageTitle } from '../hooks/usePageTitle';
import { referenceToPath } from '../utils/parseReference';
import { BookOpen, Clock, Moon, Flame, Sun, Zap } from 'lucide-react';
import { CCCLogo, MemberInPrayer } from '../components/icons/celestial-icons';

export default function LessonDetail() {
  const { date } = useParams<{ date: string }>();
  const { lessons, loading } = useLessonsByDate(date || '');
  
  const firstLesson = lessons[0];
  usePageTitle('lesson_detail', firstLesson ? `Lessons for ${date} — CCC Liturgy` : undefined);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (!lessons.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-[var(--color-text-secondary)]">No lessons found for this date.</p>
        <Link to="/lessons" className="text-[var(--color-accent-gold)] hover:underline mt-4 inline-flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg> Back to Calendar
        </Link>
      </div>
    );
  }


  const dayDisplay = firstLesson.day;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <Link to="/lessons" className="text-[var(--color-accent-gold)] text-sm hover:underline mb-4 inline-flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg> Back to Calendar
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[Outfit] text-[var(--color-text-primary)]">
          {dayDisplay}, {date}
        </h1>
        {firstLesson.occasion && (
          <div className="mt-2 inline-block px-3 py-1 rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] text-sm font-medium">
            ✦ {firstLesson.occasion}
          </div>
        )}
      </div>

      {/* Lessons */}
      <div className="space-y-4">
        {lessons.map((lesson, idx) => (
          <div
            key={idx}
            className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 animate-[fadeIn_0.4s_ease-out]"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            {lesson.time && (
              <div className="text-sm text-[var(--color-text-muted)] mb-3">
                <><Clock size={14} className="inline mr-1" /> {lesson.time}</>
              </div>
            )}

            {lesson.occasion && lessons.length > 1 && (
              <div className="text-sm font-medium text-[var(--color-accent-gold)] mb-3">
                {lesson.occasion}
              </div>
            )}

            {/* First Lesson */}
            {lesson.firstLesson && (
              <div className="mb-3">
                <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                  First Lesson
                </div>
                <Link
                  to={referenceToPath(lesson.firstLesson)}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-card-hover)] transition-colors group"
                >
                  <BookOpen size={18} />
                  <span className="text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-gold)] transition-colors font-medium">
                    {lesson.firstLesson.raw}
                  </span>
                  <span className="ml-auto text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-gold)] transition-colors">
                    Read →
                  </span>
                </Link>
              </div>
            )}

            {/* Second Lesson */}
            {lesson.secondLesson && (
              <div>
                <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                  Second Lesson
                </div>
                <Link
                  to={referenceToPath(lesson.secondLesson)}
                  className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-card-hover)] transition-colors group"
                >
                  <BookOpen size={18} />
                  <span className="text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-gold)] transition-colors font-medium">
                    {lesson.secondLesson.raw}
                  </span>
                  <span className="ml-auto text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-gold)] transition-colors">
                    Read →
                  </span>
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Related Service Link */}
      <div className="mt-6">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">Related Services</p>
        <div className="flex flex-wrap gap-2">
          {getDayServices(firstLesson.day).map(svc => (
            <Link
              key={svc.id}
              to={`/services/${svc.id}`}
              className="px-3 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] hover:border-[var(--color-accent-gold)]/50 transition-colors"
            >
              {svc.icon} {svc.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function getDayServices(day: string): { id: string; name: string; icon: JSX.Element }[] {
  switch (day?.toLowerCase()) {
    case 'sunday':
      return [
        { id: 'lords_day_service', name: "Lord's Day Service", icon: <CCCLogo size={16} /> },
        { id: 'evening_service_lords_day', name: 'Evening Service', icon: <Moon size={16} /> },
      ];
    case 'wednesday':
      return [
        { id: 'seekers_service', name: 'Seekers Service', icon: <Flame size={16} /> },
        { id: 'mercy_day_service', name: 'Mercy Day Service', icon: <MemberInPrayer size={16} /> },
      ];
    case 'friday':
      return [
        { id: 'power_day_service', name: 'Power Day Service', icon: <Zap size={16} /> },
      ];
    default:
      return [
        { id: 'morning_service', name: 'Morning Service', icon: <Sun size={16} /> },
      ];
  }
}
