'use client';

import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { Chart } from '@/components/compound/Chart';
import { CHART_COLORS } from './chart-theme';

interface ErrorGaugeProps {
  errorRate: number;
  threshold?: number;
  title?: string;
}

const ErrorGauge: React.FC<ErrorGaugeProps> = React.memo(({
  errorRate,
  threshold = 1,
  title = '에러율',
}) => {
  const successRate = 100 - errorRate;
  const isOverThreshold = errorRate > threshold;

  const data = [
    {
      name: 'background',
      value: 100,
      fill: CHART_COLORS.bgFill,
    },
    {
      name: 'success',
      value: successRate,
      fill: isOverThreshold ? '#f43f5e' : '#10b981',
    },
  ];

  return (
    <Chart.Wrapper title={title}>
      <div className="h-[200px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="90%"
            barSize={20}
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              background={{ fill: CHART_COLORS.bgFill }}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-4xl font-bold ${isOverThreshold ? 'text-rose-500' : 'text-emerald-400'}`}>
            {successRate.toFixed(1)}%
          </div>
          <div className="text-gray-500 text-sm">성공률</div>
        </div>
      </div>

      <div className="flex justify-between text-sm mt-2">
        <div className="text-gray-500">
          에러율: <span className={isOverThreshold ? 'text-rose-400' : 'text-gray-600'}>{errorRate.toFixed(2)}%</span>
        </div>
        <div className="text-gray-400">
          임계값: {threshold}%
        </div>
      </div>
    </Chart.Wrapper>
  );
});

export default ErrorGauge;
