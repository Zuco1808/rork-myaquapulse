import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Colors from '@/constants/colors';

type ConsumptionData = {
  month: string;
  value: number;
};

type ConsumptionChartProps = {
  data: ConsumptionData[];
  title?: string;
  height?: number;
  yAxisSuffix?: string;
  showLabels?: boolean;
};

export const ConsumptionChart = ({
  data,
  title = "Potrošnja vode",
  height = 220,
  yAxisSuffix = " m³",
  showLabels = true,
}: ConsumptionChartProps) => {
  const screenWidth = Dimensions.get('window').width - 32;
  
  const chartData = {
    labels: data.map(item => item.month),
    datasets: [
      {
        data: data.map(item => item.value),
        color: () => Colors.primary,
        strokeWidth: 2,
      },
    ],
  };
  
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: () => Colors.primary,
    labelColor: () => Colors.textLight,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
  };
  
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <LineChart
        data={chartData}
        width={screenWidth}
        height={height}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        yAxisSuffix={yAxisSuffix}
        fromZero
        withInnerLines={showLabels}
        withOuterLines={showLabels}
        withHorizontalLabels={showLabels}
        withVerticalLabels={showLabels}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 12,
    paddingRight: 16,
  },
});