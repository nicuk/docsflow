/**
 * ROI Calculator Logic
 * Extracted from inline JavaScript for security best practices
 */

export interface ROICalculation {
  hours: number;
  rate: number;
  monthly: number;
  roi: number;
}

export class ROICalculator {
  private static readonly BASE_COST = 99; // DocsFlow Professional base cost

  /**
   * Calculate ROI based on hours and hourly rate
   */
  static calculate(hours: number, rate: number): ROICalculation {
    const monthly = hours * rate * 4; // 4 weeks per month
    const roi = Math.round(monthly / this.BASE_COST);
    
    return {
      hours,
      rate,
      monthly,
      roi
    };
  }

  /**
   * Format currency value
   */
  static formatCurrency(value: number): string {
    return `$${value.toLocaleString()}`;
  }

  /**
   * Format hours display
   */
  static formatHours(hours: number): string {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  /**
   * Format hourly rate display
   */
  static formatRate(rate: number): string {
    return `$${rate}/hr`;
  }

  /**
   * Format ROI multiple display
   */
  static formatROI(roi: number): string {
    return `${roi}x ROI`;
  }

  /**
   * Update DOM elements with calculated values
   * This replaces the inline JavaScript functionality
   */
  static updateDisplay(calculation: ROICalculation): void {
    const elements = {
      hoursValue: document.getElementById('hoursValue'),
      rateValue: document.getElementById('rateValue'),
      monthlySavings: document.getElementById('monthlySavings'),
      roiMultiple: document.getElementById('roiMultiple')
    };

    if (elements.hoursValue) {
      elements.hoursValue.textContent = this.formatHours(calculation.hours);
    }
    
    if (elements.rateValue) {
      elements.rateValue.textContent = this.formatRate(calculation.rate);
    }
    
    if (elements.monthlySavings) {
      elements.monthlySavings.textContent = this.formatCurrency(calculation.monthly);
    }
    
    if (elements.roiMultiple) {
      elements.roiMultiple.textContent = this.formatROI(calculation.roi);
    }
  }

  /**
   * Initialize calculator event listeners
   * This replaces the inline event binding
   */
  static initialize(): void {
    const hoursSlider = document.getElementById('hoursSlider') as HTMLInputElement;
    const rateSlider = document.getElementById('rateSlider') as HTMLInputElement;

    if (!hoursSlider || !rateSlider) {
      console.warn('ROI Calculator: Required slider elements not found');
      return;
    }

    const updateCalculator = () => {
      const hours = parseInt(hoursSlider.value, 10);
      const rate = parseInt(rateSlider.value, 10);
      const calculation = this.calculate(hours, rate);
      this.updateDisplay(calculation);
    };

    // Initial calculation
    updateCalculator();

    // Event listeners
    hoursSlider.addEventListener('input', updateCalculator);
    rateSlider.addEventListener('input', updateCalculator);
  }
}
