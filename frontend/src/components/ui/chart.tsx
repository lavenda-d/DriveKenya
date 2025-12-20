// components/ui/chart.tsx
import * as React from 'react';
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { cn } from '@/lib/utils';

// Types
type ChartType = 'line' | 'bar' | 'area' | 'pie';
type ChartData = Record<string, any>[];

interface BaseChartProps {
  data: ChartData;
  className?: string;
  height?: number;
  colors?: string[];
  legend?: boolean;
  grid?: boolean;
  tooltip?: boolean;
  tooltipFormatter?: (value: any, name: string, props: any) => [string, string];
  xAxisKey?: string;
  yAxisKey?: string;
  series?: Array<{
    dataKey: string;
    name?: string;
    color?: string;
    strokeWidth?: number;
    fillOpacity?: number;
  }>;
}

interface LineChartProps extends BaseChartProps {
  type?: 'line';
}

interface BarChartProps extends BaseChartProps {
  type: 'bar';
  stacked?: boolean;
  barSize?: number;
}

interface AreaChartProps extends BaseChartProps {
  type: 'area';
  stacked?: boolean;
}

interface PieChartProps extends Omit<BaseChartProps, 'xAxisKey' | 'yAxisKey' | 'series'> {
  type: 'pie';
  dataKey: string;
  nameKey: string;
  innerRadius?: number | string;
  outerRadius?: number | string;
  label?: boolean;
  labelLine?: boolean;
  startAngle?: number;
  endAngle?: number;
  cx?: number | string;
  cy?: number | string;
  paddingAngle?: number;
}

type ChartProps = LineChartProps | BarChartProps | AreaChartProps | PieChartProps;

const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

const renderTooltipContent = (props: TooltipProps<any, any>, formatter?: any) => {
  const { active, payload, label } = props;

  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-4 shadow-sm">
        <p className="font-medium">{label}</p>
        <div className="mt-2 space-y-1">
          {payload.map((entry, index) => {
            const [value, name] = formatter
              ? formatter(entry.value, entry.name, entry)
              : [entry.value, entry.name];

            return (
              <div key={`tooltip-item-${index}`} className="flex items-center">
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">{name}:</span>
                <span className="ml-1 text-sm font-medium">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

const Chart = (props: ChartProps) => {
  const {
    type = 'line',
    data,
    className,
    height = 300,
    colors = DEFAULT_COLORS,
    legend = true,
    grid = true,
    tooltip = true,
    tooltipFormatter,
  } = props;

  const chartProps = {
    data,
    margin: { top: 10, right: 10, left: 0, bottom: 0 },
    className: cn('w-full', className),
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <RechartsLineChart {...chartProps}>
            {grid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
            <XAxis
              dataKey={props.xAxisKey}
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            {tooltip && (
              <Tooltip
                content={(props) => renderTooltipContent(props, tooltipFormatter)}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
            )}
            {legend && <Legend />}
            {props.series?.map((series, index) => (
              <Line
                key={`line-${index}`}
                type="monotone"
                dataKey={series.dataKey}
                name={series.name || series.dataKey}
                stroke={series.color || colors[index % colors.length]}
                strokeWidth={series.strokeWidth || 2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </RechartsLineChart>
        );

      case 'bar':
        return (
          <RechartsBarChart {...chartProps}>
            {grid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
            <XAxis
              dataKey={props.xAxisKey}
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            {tooltip && (
              <Tooltip
                content={(props) => renderTooltipContent(props, tooltipFormatter)}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
            )}
            {legend && <Legend />}
            {props.series?.map((series, index) => (
              <Bar
                key={`bar-${index}`}
                dataKey={series.dataKey}
                name={series.name || series.dataKey}
                fill={series.color || colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
                stackId={props.stacked ? 'stack' : undefined}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={series.color || colors[index % colors.length]}
                  />
                ))}
              </Bar>
            ))}
          </RechartsBarChart>
        );

      case 'area':
        return (
          <RechartsAreaChart {...chartProps}>
            {grid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
            <XAxis
              dataKey={props.xAxisKey}
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            {tooltip && (
              <Tooltip
                content={(props) => renderTooltipContent(props, tooltipFormatter)}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
            )}
            {legend && <Legend />}
            {props.series?.map((series, index) => (
              <Area
                key={`area-${index}`}
                type="monotone"
                dataKey={series.dataKey}
                name={series.name || series.dataKey}
                stroke={series.color || colors[index % colors.length]}
                fill={series.color || colors[index % colors.length]}
                fillOpacity={series.fillOpacity || 0.1}
                strokeWidth={series.strokeWidth || 2}
              />
            ))}
          </RechartsAreaChart>
        );

      case 'pie':
        const pieProps = props as PieChartProps;
        return (
          <RechartsPieChart {...chartProps} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <Pie
              data={data}
              cx={pieProps.cx || '50%'}
              cy={pieProps.cy || '50%'}
              innerRadius={pieProps.innerRadius || '0%'}
              outerRadius={pieProps.outerRadius || '80%'}
              paddingAngle={pieProps.paddingAngle || 0}
              dataKey={pieProps.dataKey}
              nameKey={pieProps.nameKey}
              label={pieProps.label}
              labelLine={pieProps.labelLine}
              startAngle={pieProps.startAngle}
              endAngle={pieProps.endAngle}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  stroke="#fff"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            {tooltip && (
              <Tooltip
                content={(props) => renderTooltipContent(props, tooltipFormatter)}
              />
            )}
            {legend && <Legend />}
          </RechartsPieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ width: '100%', height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export { Chart, type ChartProps };