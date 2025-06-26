import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Colors from '@/constants/colors';

interface BarChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
}

export const BarChartConsumption: React.FC<BarChartProps> = ({ data, xKey, yKey }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nema podataka za prikaz</Text>
      </View>
    );
  }

  // Find max value for scaling
  const maxValue = Math.max(...data.map(item => item[yKey]));
  const chartHeight = 200;

  return (
    <View style={styles.container}>
      <View style={styles.yAxis}>
        {[0, 1, 2, 3, 4].map((_, index) => {
          const value = (maxValue * (4 - index)) / 4;
          return (
            <Text key={index} style={styles.yAxisLabel}>
              {value.toFixed(1)}
            </Text>
          );
        })}
      </View>

      <View style={styles.chartContent}>
        <View style={styles.bars}>
          {data.map((item, index) => {
            const barHeight = (item[yKey] / maxValue) * chartHeight;
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barLabelContainer}>
                  <Text style={styles.barValue}>{item[yKey].toFixed(1)}</Text>
                </View>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: Colors.primary,
                    },
                  ]}
                />
                <Text style={styles.xAxisLabel}>{item[xKey]}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.horizontalLines}>
          {[0, 1, 2, 3, 4].map((_, index) => (
            <View
              key={index}
              style={[
                styles.horizontalLine,
                {
                  bottom: (chartHeight * index) / 4,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textLight,
    fontSize: 14,
  },
  yAxis: {
    width: 40,
    height: 200,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  yAxisLabel: {
    color: Colors.textLight,
    fontSize: 10,
  },
  chartContent: {
    flex: 1,
    height: 200,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 200,
    justifyContent: 'space-around',
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 200,
    flex: 1,
  },
  barLabelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 10,
    color: Colors.textLight,
  },
  bar: {
    width: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  xAxisLabel: {
    marginTop: 8,
    fontSize: 10,
    color: Colors.text,
  },
  horizontalLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 200,
  },
  horizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.border,
  },
});