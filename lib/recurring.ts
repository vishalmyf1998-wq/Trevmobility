import { RRule } from 'rrule';
import { RecurringSettings } from './types';

export function generateRecurringDates(settings: RecurringSettings): Date[] {
  const { frequency, selectedDays, startDate, endDate } = settings;

  const ruleOptions: Partial<RRule.Options> = {
    freq: RRule.WEEKLY,
    dtstart: startDate,
    until: endDate,
  };

  if (frequency === 'daily') {
    ruleOptions.freq = RRule.DAILY;
  } else if (frequency === 'weekly') {
    const byweekday = selectedDays.map(dayToRRuleDay);
    if (byweekday.length > 0) {
      ruleOptions.byweekday = byweekday;
    }
  } else if (frequency === 'custom' && selectedDays.length > 0) {
    const byweekday = selectedDays.map(dayToRRuleDay);
     if (byweekday.length > 0) {
      ruleOptions.byweekday = byweekday;
    }
  }

  const rule = new RRule(ruleOptions as RRule.Options);

  return rule.all();
}

function dayToRRuleDay(day: string): RRule.Weekday {
  const dayMap: { [key: string]: RRule.Weekday } = {
    Mon: RRule.MO,
    Tue: RRule.TU,
    Wed: RRule.WE,
    Thu: RRule.TH,
    Fri: RRule.FR,
    Sat: RRule.SA,
    Sun: RRule.SU,
  };
  return dayMap[day];
}
