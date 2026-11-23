import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';

interface GpioPinRecord {
  pin: string;
  subsystem: string;
  direction: 'Digital OUT' | 'Digital IN' | 'ADC Analog IN' | 'LEDC PWM';
  state: string;
  voltage: string;
  status: 'Active' | 'Standby' | 'Armed' | 'Nominal';
}

export const DeviceInformationPage: React.FC = () => {
  const { dieTemperature, batteryVoltage, latencyMs, showToast } = useTelemetry();
  const [filterActivePins, setFilterActivePins] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);

  const gpioPins: GpioPinRecord[] = [
    { pin: 'GPIO 19', subsystem: 'Submersible Water Pump Relay', direction: 'Digital OUT', state: 'Active HIGH (Relay Driver)', voltage: '3.3V / 5.0V', status: 'Active' },
    { pin: 'GPIO 13', subsystem: 'Extinguisher Nozzle Servo (50Hz PWM)', direction: 'LEDC PWM', state: '0° - 180° Dynamic Vectoring', voltage: '5.0V', status: 'Active' },
    { pin: 'GPIO 12', subsystem: 'Acoustic Piezo Alarm Siren (CH 0)', direction: 'LEDC PWM', state: '900Hz / 1400Hz Warble', voltage: '3.3V', status: 'Armed' },
    { pin: 'GPIO 16', subsystem: 'Neo 6M GPS Module RX2 (HardwareSerial 2)', direction: 'Digital IN', state: '9600 Baud NMEA Sentence Stream', voltage: '3.3V', status: 'Active' },
    { pin: 'GPIO 17', subsystem: 'Neo 6M GPS Module TX2 (HardwareSerial 2)', direction: 'Digital OUT', state: 'UBX / NMEA Command Line', voltage: '3.3V', status: 'Nominal' },
    { pin: 'GPIO 25', subsystem: 'HC-SR04 Front-Left Ultrasonic Trigger', direction: 'Digital OUT', state: '10µs High Sonic Pulse', voltage: '3.3V', status: 'Active' },
    { pin: 'GPIO 26', subsystem: 'HC-SR04 Front-Left Ultrasonic Echo', direction: 'Digital IN', state: 'Time-of-Flight Edge Interrupt', voltage: '3.3V', status: 'Active' },
    { pin: 'GPIO 27', subsystem: 'HC-SR04 Front-Right Ultrasonic Trigger', direction: 'Digital OUT', state: 'Secondary Pulse Staging', voltage: '3.3V', status: 'Standby' },
    { pin: 'GPIO 14', subsystem: 'HC-SR04 Front-Right Ultrasonic Echo', direction: 'Digital IN', state: 'Secondary Return Bus', voltage: '3.3V', status: 'Standby' },
    { pin: 'GPIO 21', subsystem: 'I2C Bus SDA (Adafruit SH1106G OLED)', direction: 'Digital OUT', state: '400 kHz Fast I2C Bus (0x3C)', voltage: '3.3V', status: 'Active' },
    { pin: 'GPIO 22', subsystem: 'I2C Bus SCL (Adafruit SH1106G OLED)', direction: 'Digital OUT', state: '400 kHz Fast I2C Clock', voltage: '3.3V', status: 'Active' },
    { pin: 'GPIO 33', subsystem: 'IR Flame Sensor 0: Front-Left (45°)', direction: 'ADC Analog IN', state: 'ADC1 Channel Input', voltage: '0.33V', status: 'Nominal' },
    { pin: 'GPIO 32', subsystem: 'IR Flame Sensor 1: Front-Center (90°)', direction: 'ADC Analog IN', state: 'ADC1 Channel Input', voltage: '0.34V', status: 'Nominal' },
    { pin: 'GPIO 35', subsystem: 'IR Flame Sensor 2: Front-Right (135°)', direction: 'ADC Analog IN', state: 'ADC1 Channel Input', voltage: '0.32V', status: 'Nominal' },
    { pin: 'GPIO 34', subsystem: 'IR Flame Sensor 3: Left Flank (0°)', direction: 'ADC Analog IN', state: 'ADC1 Channel Input', voltage: '0.35V', status: 'Nominal' },
    { pin: 'GPIO 39', subsystem: 'IR Flame Sensor 4: Right Flank (180°)', direction: 'ADC Analog IN', state: 'Sensor VN (Input Only)', voltage: '0.34V', status: 'Nominal' }
  ];

  const filteredPins = filterActivePins
    ? gpioPins.filter(p => p.status === 'Active' || p.status === 'Nominal')
    : gpioPins;

  const handleQueryRegisters = () => {
    setIsQuerying(true);
    showToast('Polling ESP32-S3 internal registers & peripheral busses...');
    setTimeout(() => {
      setIsQuerying(false);
      showToast(`Registers polled: ${gpioPins.length} GPIOs synced. FreeRTOS heap 284 KB. Latency ${latencyMs}ms`);
    }, 800);
  };

  return (
    <div className="flex flex-col w-full gap-5 sm:gap-6">
      {/* Top Header & Refresh Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-4 sm:p-6 border border-neutral-200/90 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-neutral-800 text-2xl sm:text-3xl">memory</span>
            Device Specifications & Architecture
          </h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">
            ESP32-S3 SoC parameters, bus mappings, internal memory allocation, and live GPIO multiplexing.
          </p>
        </div>

        <button
          onClick={handleQueryRegisters}
          disabled={isQuerying}
          className="px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 transition shadow-2xs flex items-center gap-2 self-start sm:self-auto active:scale-[0.98] cursor-pointer"
        >
          <span className={`material-symbols-outlined text-base ${isQuerying ? 'animate-spin' : ''}`}>
            sync
          </span>
          {isQuerying ? 'POLLING NODE...' : 'QUERY REGISTERS'}
        </button>
      </div>

      {/* SoC Specifications Card */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-800 border border-neutral-200 shrink-0">
              <span className="material-symbols-outlined text-3xl sm:text-4xl">developer_board</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-[11px] uppercase bg-neutral-100 px-2.5 py-0.5 rounded-full text-neutral-700 font-bold border border-neutral-200">
                  Silicon Rev v3.0
                </span>
                <span className="w-2 h-2 rounded-full bg-neutral-700 animate-pulse" />
                <span className="text-xs font-bold text-neutral-900">FreeRTOS v10.4 Active</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900">
                Espressif ESP32-S3-WROOM-1 (Xtensa Dual-Core LX7)
              </h2>
              <p className="text-neutral-500 text-xs font-mono mt-0.5">
                Node: NODE-ESP32-FIRE-ROBO-01 &middot; MAC: 24:6F:28:9B:A4:72
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-5 text-xs font-mono">
            <div className="text-right">
              <span className="text-neutral-500 uppercase font-sans font-bold block text-[11px]">Core Clock</span>
              <span className="font-bold text-neutral-900 text-sm">240 MHz</span>
            </div>
            <div className="h-8 w-[1px] bg-neutral-200" />
            <div className="text-right">
              <span className="text-neutral-500 uppercase font-sans font-bold block text-[11px]">SRAM / PSRAM</span>
              <span className="font-bold text-neutral-900 text-sm">512KB / 8MB</span>
            </div>
            <div className="h-8 w-[1px] bg-neutral-200" />
            <div className="text-right">
              <span className="text-neutral-500 uppercase font-sans font-bold block text-[11px]">Flash ROM</span>
              <span className="font-bold text-neutral-900 text-sm">16 MB Q-SPI</span>
            </div>
          </div>
        </div>

        {/* Real-time Hardware Telemetry Gauges */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 pt-6">
          <div className="p-3.5 sm:p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
            <span className="text-neutral-500 text-[11px] font-bold block uppercase tracking-wider">Die Temp</span>
            <span className="text-xl sm:text-2xl font-extrabold text-neutral-900 font-mono mt-0.5 block">{dieTemperature} °C</span>
            <span className="text-[11px] text-neutral-900 font-semibold block mt-1">Nominal (&lt; 65°C)</span>
          </div>

          <div className="p-3.5 sm:p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
            <span className="text-neutral-500 text-[11px] font-bold block uppercase tracking-wider">3.3V Logic Rail</span>
            <span className="text-xl sm:text-2xl font-extrabold text-neutral-900 font-mono mt-0.5 block">3.31 V</span>
            <span className="text-[11px] text-neutral-900 font-semibold block mt-1">+0.3% Tol</span>
          </div>

          <div className="p-3.5 sm:p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
            <span className="text-neutral-500 text-[11px] font-bold block uppercase tracking-wider">5.0V Rail</span>
            <span className="text-xl sm:text-2xl font-extrabold text-neutral-900 font-mono mt-0.5 block">5.04 V</span>
            <span className="text-[11px] text-neutral-900 font-semibold block mt-1">+0.8% Tol</span>
          </div>

          <div className="p-3.5 sm:p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
            <span className="text-neutral-500 text-[11px] font-bold block uppercase tracking-wider">12V Battery Pack</span>
            <span className="text-xl sm:text-2xl font-extrabold text-neutral-900 font-mono mt-0.5 block">{batteryVoltage} V</span>
            <span className="text-[11px] text-neutral-900 font-semibold block mt-1">3S Li-Ion 18650</span>
          </div>

          <div className="p-3.5 sm:p-4 bg-neutral-50 rounded-2xl border border-neutral-100 col-span-2 md:col-span-1">
            <span className="text-neutral-500 text-[11px] font-bold block uppercase tracking-wider">Free Heap</span>
            <span className="text-xl sm:text-2xl font-extrabold text-neutral-900 font-mono mt-0.5 block">284 KB</span>
            <span className="text-[11px] text-neutral-500 font-medium block mt-1">55.4% Remaining</span>
          </div>
        </div>
      </div>

      {/* GPIO Pin Mapping Table */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 mb-4 border-b border-neutral-100">
          <div>
            <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-neutral-800">alt_route</span>
              Multiplexed GPIO Pinout & Peripherals
            </h3>
            <p className="text-neutral-500 text-xs mt-0.5">
              Current logic levels, electrical modes, and mapped hardware peripherals.
            </p>
          </div>

          <button
            onClick={() => setFilterActivePins(!filterActivePins)}
            className="px-4 py-2 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-xs font-bold transition self-start sm:self-auto cursor-pointer"
          >
            {filterActivePins ? `Show All ${gpioPins.length} Pins` : 'Highlight Active Only'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 uppercase font-sans font-bold">
                <th className="py-3 px-3">Pin</th>
                <th className="py-3 px-3">Mapped Subsystem</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Logic / State</th>
                <th className="py-3 px-3">Voltage</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredPins.map(pin => (
                <tr key={pin.pin} className="hover:bg-neutral-50 transition">
                  <td className="py-3 px-3 font-bold text-neutral-900">{pin.pin}</td>
                  <td className="py-3 px-3 font-sans font-semibold text-neutral-800">{pin.subsystem}</td>
                  <td className="py-3 px-3 text-neutral-500">{pin.direction}</td>
                  <td className="py-3 px-3 font-bold text-neutral-900">{pin.state}</td>
                  <td className="py-3 px-3 text-neutral-500">{pin.voltage}</td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        pin.status === 'Active'
                          ? 'bg-neutral-100 text-neutral-900 border border-neutral-300'
                          : pin.status === 'Nominal'
                          ? 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                          : pin.status === 'Armed'
                          ? 'bg-neutral-100 text-neutral-900 border border-neutral-300'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {pin.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4 Subsystem Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center mb-3 border border-neutral-200">
              <span className="material-symbols-outlined text-2xl">tv</span>
            </div>
            <h4 className="font-bold text-neutral-900 text-sm">Adafruit SH1106G OLED</h4>
            <p className="text-neutral-500 text-xs mt-1">
              128x64 monochrome OLED over fast 400kHz I2C bus (0x3C) rendering 5-channel flame grid and telemetry.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 text-xs font-mono flex justify-between text-neutral-500">
            <span>I2C: SDA=21, SCL=22</span>
            <span className="text-neutral-900 font-bold">128x64 Display</span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center mb-3 border border-neutral-200">
              <span className="material-symbols-outlined text-2xl">precision_manufacturing</span>
            </div>
            <h4 className="font-bold text-neutral-900 text-sm">Nozzle Servo Motor</h4>
            <p className="text-neutral-500 text-xs mt-1">
              GPIO 13 50Hz PWM servo positioning nozzle to targeted flame angles: 45°, 90°, 135°, 0°, 180°.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 text-xs font-mono flex justify-between text-neutral-500">
            <span>Standby: 90° Center</span>
            <span className="text-neutral-900 font-bold">5-Sector Angles</span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center mb-3 border border-neutral-200">
              <span className="material-symbols-outlined text-2xl">location_on</span>
            </div>
            <h4 className="font-bold text-neutral-900 text-sm">U-blox Neo 6M GPS</h4>
            <p className="text-neutral-500 text-xs mt-1">
              Dedicated Serial2 bus (RX:16, TX:17) maintaining continuous 3D satellite fix with live Supabase logging.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 text-xs font-mono flex justify-between text-neutral-500">
            <span>Baud: 9600 8N1</span>
            <span className="text-neutral-900 font-bold">NMEA Stream</span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center mb-3 border border-neutral-200">
              <span className="material-symbols-outlined text-2xl">cloud_sync</span>
            </div>
            <h4 className="font-bold text-neutral-900 text-sm">Supabase IoT Database</h4>
            <p className="text-neutral-500 text-xs mt-1">
              Real-time HTTP REST logging to table /rest/v1/fire_events recording coordinates, intensity, and relay state.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 text-xs font-mono flex justify-between text-neutral-500">
            <span>Latency: {latencyMs}ms</span>
            <span className="text-neutral-900 font-bold">REST & WSS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
