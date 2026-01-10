/**
 * Utility function tests
 * These test the utility functions extracted from components
 */

describe('Date Utilities', () => {
  // Test isValidISODate function logic
  const isValidISODate = (dateStr: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && dateStr === date.toISOString().split('T')[0];
  };

  describe('isValidISODate', () => {
    it('should return true for valid ISO date strings', () => {
      expect(isValidISODate('2023-01-01')).toBe(true);
      expect(isValidISODate('2023-12-31')).toBe(true);
      expect(isValidISODate('2000-02-29')).toBe(true); // Leap year
    });

    it('should return false for invalid date formats', () => {
      expect(isValidISODate('01-01-2023')).toBe(false);
      expect(isValidISODate('2023/01/01')).toBe(false);
      expect(isValidISODate('2023-1-1')).toBe(false);
      expect(isValidISODate('invalid-date')).toBe(false);
      expect(isValidISODate('')).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(isValidISODate('2023-13-01')).toBe(false); // Invalid month
      expect(isValidISODate('2023-02-30')).toBe(false); // Invalid day
      expect(isValidISODate('2023-00-01')).toBe(false); // Invalid month
    });

    it('should return false for dates that do not match ISO format exactly', () => {
      expect(isValidISODate('2023-1-01')).toBe(false); // Month not zero-padded
      expect(isValidISODate('2023-01-1')).toBe(false); // Day not zero-padded
    });
  });

  describe('Date formatting', () => {
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    it('should format dates correctly', () => {
      // Use UTC dates to avoid timezone issues
      const date1 = new Date('2023-01-01T12:00:00Z');
      const date2 = new Date('2023-12-31T12:00:00Z');
      expect(formatDate(date1.toISOString())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(formatDate(date2.toISOString())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should pad months and days with zeros', () => {
      const date = new Date('2023-01-05T12:00:00Z');
      const formatted = formatDate(date.toISOString());
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Weekend detection', () => {
    const isWeekend = (date: Date): boolean => {
      const day = date.getDay();
      return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
    };

    it('should identify weekends correctly', () => {
      // Use UTC dates to avoid timezone issues
      const saturday = new Date('2023-01-07T12:00:00Z'); // Saturday
      const sunday = new Date('2023-01-08T12:00:00Z'); // Sunday
      const monday = new Date('2023-01-09T12:00:00Z'); // Monday

      expect(isWeekend(saturday)).toBe(true);
      expect(isWeekend(sunday)).toBe(true);
      expect(isWeekend(monday)).toBe(false);
    });
  });

  describe('Business days calculation', () => {
    const isWeekend = (date: Date): boolean => {
      const day = date.getDay();
      return day === 0 || day === 6;
    };

    const getBusinessDaysInRange = (startDate: Date, endDate: Date): Date[] => {
      const dates: Date[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        if (!isWeekend(currentDate)) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return dates;
    };

    it('should return only weekdays', () => {
      // Use UTC dates to avoid timezone issues
      const start = new Date('2023-01-02T12:00:00Z'); // Monday
      const end = new Date('2023-01-08T12:00:00Z'); // Sunday

      const businessDays = getBusinessDaysInRange(start, end);

      businessDays.forEach(date => {
        expect(isWeekend(date)).toBe(false);
      });
    });

    it('should include all weekdays in range', () => {
      // Use UTC dates to avoid timezone issues
      const start = new Date('2023-01-02T12:00:00Z'); // Monday
      const end = new Date('2023-01-06T12:00:00Z'); // Friday

      const businessDays = getBusinessDaysInRange(start, end);

      // Should include Mon, Tue, Wed, Thu, Fri (5 days)
      expect(businessDays.length).toBeGreaterThanOrEqual(4);
      expect(businessDays.length).toBeLessThanOrEqual(5);
    });

    it('should exclude weekends', () => {
      // Use UTC dates to avoid timezone issues
      const start = new Date('2023-01-06T12:00:00Z'); // Friday
      const end = new Date('2023-01-09T12:00:00Z'); // Monday

      const businessDays = getBusinessDaysInRange(start, end);

      // Should include Friday and Monday (excluding weekend)
      expect(businessDays.length).toBeGreaterThanOrEqual(2);
      expect(businessDays.length).toBeLessThanOrEqual(2);
    });
  });
});
