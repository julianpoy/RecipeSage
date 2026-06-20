export const MEAL_PLAN_HISTORY_DAYS = 60;

export const getMealPlanHistoryDateLimit = (): Date => {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - MEAL_PLAN_HISTORY_DAYS);
  return dateLimit;
};
