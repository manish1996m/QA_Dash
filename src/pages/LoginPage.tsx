import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, LayoutDashboard, Database, Sparkles, UserCheck } from 'lucide-react';

const LOGO_BASE64 = 'UklGRpoRAABXRUJQVlA4TI4RAAAvwcAeEN8HK5Ik1VbNXmbme/3reCqegPd+L9Ny25AdSZIiWZE9dMxMorBwJ9uJgF/M8N5wV09BkiRJkRNV3b0rZrpL/z/prMesTswDjQnH2rZjzj2I7VS2zQWYazA24KTMApLK7FKzMzq7Gtv2TADIFUleCVPBK0M9iLOV4AV1DT9vhGnC2o7VRut3w7P+B8dSJaNzV4IMCC0gNSxBLqkcE0H/deq2EkZptvb80RRK61X0rRY+xcx3zUlAJhM845goLaEme1ev2TYQWYme+TJokXl7x2n8MpbKRWa0win509BviQtZ9yzzSwY6Cnfurap2/lcWym76ac9xo+29PiesMVkYS961+BSwbXTSeoq18se/WlfLX0FdaJE63wRhPpLJL+doTX62UP41QrNSs/6TvFeRgCRIgAlFwARRKAEGSoIolIAklAQRZEImFIVMyIRsIAPZoEZRx8F86Rx2LaypX5W5cTaqjjcbKWitsVz+ELk++NpbSdPciAV+PROHOppV50PInRw55AY5kAOFYTK7ciWTA6VBAeRAAeRAQUQZAsNUYhiEKRq92ZWNeytd0ZhCe5KtiQgEICACkBARI1KJiERPW/pyBiT6SgzZ0tcW5z+4X+B1UHmmznWam5FnmV/fSgbXJ2WobOzFFPa+CHNotP75h7NYV7uOC5QqdIu3KpnMHgzZXHAk9Zp+fXTU+pcYLh1hG05LYenUh/Xvzy//eono4W6r12xmnn9/NL8ire/NtWpVAS1fzZL16o14HM9OwkPezV3JE5ZBpgybLLdObPxebxSyh4lGOIpGuAAPWBDHh3AaisLlEgqAuwV2HD/Ig0K2Sc8GfiARkAvEONEGJsAn4cTlN/CDqRAuMJdQgKlXAkWYd3vvznPzWDG43E3+HD/N/Q070kbjM+dkX/FU2kFPzT+6zgsVz0L7aqXb7bO/uMdgDdu2Z0qjb4ZqG+wKsSDEboyi6b0nteTee++JJUsqxYbYu5BKsWA32b7pxFmISB1mhg7COGPFDSi//L7ned93hnzfcey/54noPwVJkuQ2UiRTKADNZqEJoo89HqCZRwVLvvmalu7WrFtJey4az5O2HMhdtMOy+TYxgcfqr5y8tF2W9d3u/pb2FATBnoQOik8cO1HfZKRZVKmCMfGJU777ao8yO0Z39eSOUYnjJx3Iyf9sa5Il+X9R7Qnn+fJvu5WPnekR3uN0Z+K4ifruxx/usaKzY3pSh85fv7gtSZGLTiP0E9uTF8wqsB52J3ZSwoUX69y6S/HWGNdxugvsTD6wN3n+7LvetaAH3IXMbGw/v+V6NXaNje8g4oSxE7P236H73uPWw9cXE+kxnzffoMaScYkJo4yKJu/fN2PO3fc+8J718NWX3zH0zapMHDeWiMdPztp3+8y773vg4dcs6M+XpEd8y818k+rOlolENDlrv+577n/wkccsiG/+Rl98fqse30RXKBbJ2cKchfzQo48/+Zb1sOtvdCsbMd2gWtHWnAP79WjGXfc+YPjpf1tQP3Qb8o2KW6Kledu23zED1PHYE089/WyhZkEd0W3Ql6uPZnYmL5h75z33PWj4mefe/FmzIO24/rxvvOGKWE1Zfzd6H71+4Bd+StIsSZcyJwV3f9993qCOZ59/4c1LrWz6VLBj15LFvNQQ71mye0dBkqBh33tA4Cs0i6JgydJF6WmpGcs4k4g5gzmVU9LSFy7dA8fJ31//qlHsefqPRXnHnkVpeZS7es1aojW0etXKFcszl+kBUFr6osU7kjS+4t//+YHpJ0s6W7BnYUregc2TeNOGdVIESklftCRJi72UkywpWpyWnzM+cey4CUpIlLZ0lzU9+/RoS0LnqAQxq1ThlE+3Li2wnh40PX/SmfaOzlGJYym+cwJkNUYafZaXu+2TjxfttpaH9uKUnPiu02cMzoTZyN6BWKlE3pSuyHDu2ZG1c9EuC6lzYerELj7drpPQbrcZ6tDPIKT7kyNtSFFZH1pGsGNh/rieOrrjR6F2CVuPSpL0zOQwm0DhU5P/cnyHJcTp+fF6BLajumxIo/C+jC1CE9mzPlgw+3GB+d+xMD9R4IQoTOR6tTN5UTaJ+I7z0CzTH1yUOk4/okf6sQQSfbVjlc6knLFJNWL+PKK5x819cEnKgTNEpB/V48R4m4AeKvufTbbJsd+um2eb+mBSel5CBxF1UryxetNhE2mTdD/ls097KkDT582dTXN41rtJ5h0BpE6M7yRiI+Kx484I6cRbgVW2RL0M38l30XGzvjgtLwHIiGjc+Hbx02E1AtvYKu1C301mrWJP6paxiYbIiCZMOm0TarPUWTY1TUe+h9773pQszJgwDmk80aTNXWLaV2TSMpE/aVfkFPa9/J4ZQ07LnUA0npmIJtHmTYzuT3skeF+OsUX+hPaGKRIu8Pv3mTHcnZqzeRIU69HGDT3QR2wMtxFR4jLIZ0b88Wibqm7XI8P38f30ntOE79OE796wCWsjbaD1UZCuVe0GPTMzGBWjj7fh0tG9ZGSL/AC9l2Q2lqZuoI2GwBFex+GIlRPA7gGROcuOmDpSxiVCP0jHTTeSyVjH66HW8Vqi9QIY/NjiRf7oD8EQbLqM4dAgoof4FbOxbC3QOgJasyEMcnoFgd2oPIG34+3I+VOlfel5vy/yw6++azbWAMBknGj1RkT78syJdmN3CqhfN48WDcCmyYh4BxpE/Ai9VmCynTUirSbaZIecyaRccCN3YfMpxB/z52VLRwP/vO9+oR8lcx1amrFapFXMm22QDv1TO0Gr7P8ERB/uR23K2fPoVrvsdZ3Mj710zFwVrWLm1cRQ8MlHRJ3LMviADRSGJly61zyae2uYjCtl5sdfNtU/KkpdsVKssYj4DE5NAf1O5DbDyfvs+JE9l2ffLmX4Aw9KzGymtxSkZApYQUQJiETdn11IhkYbcbKg67l97myaES4jGsePQj/BLwfMNK/KWCHQcqIOxIVG95MTBjbbP0ymfbitThmzkJmRNpnef9A4KjLzMVMNBjKXI2USUTtiCuh+4GNvajIRPm/PBtOoaCn/fIhxMeAn6WVTncjIhFpmqAsxEXQ/WYCeyTRV0GnO1H0X9ZJy3cNSP/WkmQbH6anLoDKYOb8nYjLs/2EaWXdEYabNAdOoP6RcKTfRK6aaHGZAAXogtgDzVNhcd0QiwmYa8d00QspwBT/9sonGxpfmiteSIxFZsP/cHiXjEmi6RErvhwX1P2n4aebXzfQPlr4RAkcwRPb9qP8cLSF6JpoGTpcS8SqMRX6GrjARcblC7Ogu3Q+cTPuiDGYgpiPTNPk6yduS2IAv10ykMSJybIi9oPsk+mCa3UbZM2CRyJl4In6dTaobhQYRP3u1mYjLEnAALxrsBf6AeUEvAfZpgpWEf8i5UsF09VAzLbZdnidY0sdsB7FuzrbrRIMH3UzBUsg/5ZxFH4n8LNFz1wwx0yb2ErycORERuR3F84lGIiJn3k2E5rHvhEk5qWC6ZrBmJg2cCs1TMMg8fx7N6JU9UycsW2R6J0JK9Ety01UDNVNpQBZcSUhERMFi83XP5Vt5Zi9b5D9Ei1EP0PvR8qr+BT5S5OfpMpMR2zcHDCHj8bBLYJrLs+fwCJ5xt3gxinrLT1wrscE5c+0QxQ3bayyFdOCxuyBGS/qwftFSyEmFN+KPRBG9eMEQzWQaMmzvJx9zO15FCNoPDZczTGACph9i4jSzadCwvR9zF8aoH/suuhtbsJJwVk7vJ8XFiF64pm+SZsLX/o/wkHgkjsEgXq9Dar5STsRLYr/ANKy/ZkINGJYdKVgOnId9F/Z94sWoqxT+CdLrEvOPDuOdJgxjIvDo3fDsYEwKAzL6UeIXz8UMNec/yxsccwIOiqej+iV+QLgYdaMCVwnqfwFs+2km1eCYPmEAiSULynAe+y+7wohM7BeHOYZoZtXQfo4TBpKnt4 rVOPmc0Jc5+mvmVWx/h35wmtzy5cy3w+SceFZgvsaBOiHzlnKcmCbz/TIrEvEGMCyEazFzqWHXzRR/pDxmfjVCoaof9AjFsmNm/VjH2euC8xOvK0DXQJPufkma+RU7KMZx7h+i+mV+gvklFc4Cv3HOIkxEcQMcegHU/Sj4SY5W4CQYAgzTz8ZqVqGh/WMcF1z5z/eNWFg/moirEPHi8z+cc4hqs4gC/R10wdnr3nlQviKu09umUPDHyxxEfWU9qCV8XD8H0bmr/vWqdD1WAfuJPg6imEGxmgVpiF410bDLbnxbGNPTJyVHIowjRP2Hahal2MH9+zqI6IJzV137r7dffwLMY4eh94ZFnCB4pO8gGFnWgTjjNgZFedg5vozZcYKoD7MDKWZAXKxmfeIhg/r3jXEoKIb7D4xLstD/uUHs0CGDBw3oT/0MEQ0YOCRu6J/inPN7p4AAUGhhmKowAxOq8DeiXxG+GqDmQAg5XAN1TKuuhxkcNt8NVfjz907+Bb0avUANoaTEC6XjhhmUmIRAeRlQpfbzr87ffiFn4UHLxXnUDeTTCg/q5/h7+tWCgVfZrBV+r/8p1Cydn39x/qrxwcKfLZzAbwedWuDn35IAFYeByrVuIVAGk64yHcR6rVQY9APHz/JMqqorAxKU83UGcen+gDhBp1rSQdyCzEKIDv78vYb4vRWoWKMKmEEbkb/oqHFf1rdWCyj3ebxE1FjiF+Jqg6lWQirbmmu9ROSu8f3ugpfbCuWiQHGTnri7vg3kWHWkXr8wT3OJX0DZkUZwZZ6GI4dh0QrUIgGNSn213sbWWgi3MaNbVXr4vzADj1aFGpmotgQ1fLEHZeJu9isf9rfVeUVqKAW5oCyqXT6cUH21RuW1+Cp8AUi1z+0VyNPsAt8pStQZOOL2StUWJOXCFnCXA1qESR8tVsRV45XI3SakVPBdENVWlwgbwgd/0tKmqSsT4m/yUohxN4hTbMTfgvDS1Qjo+UtfFSKEJmoS3yNUahSrlSddExDR5g0lSvJUa1QhvTA1ilTyajQIgRp1GlTSOSTAQ91Djejr+V0jn+j79KiDEvUUVVSXNqIcqsTUir9xd43gAupcWgVuxJIKLkbp+eR3HLWU16B7p5rZFSwtLo3KGxCtmt+N27MsoLla3Urgi68DPVIAXWKZiKOVGlU3CH6aTtEzyV2ttaIWcQp/ig1OOW2SioKkSdLbtGiH8NMLPqzb1OB6oFYNqAndgQJqQcoVkqfGEZRFuXYEJs2wK4Cb2iohnubWorayUFIMr8CDL7MFUYT6w7rgRzPVtfgC/JK24hrIYUApokyTqAheS12liIYKjYgolMA8/XUY0c8J6khQOF3lxc11gqb2Sxo9cBTigu3rluOvOtzW6MZPLgE1Li3koG68FhGoxw/W4EeU1cW+etChKFAiuUYN3VxiAuWtjfBRq8ARLfT4ITUIP7qgo5gyRZxFDeBxq0ipGLcKVS21bi+RKof+BNSFBpfRYXcfpbVeoiAo//P8qceUKhEQ2XO0jUJNpaCL4trmojo53P040eE6P6JYBdGvvbWsSqPmEBNoxt1HUYVfq1KgsvvBmVE5olkJtEVD3KYQ4/IIf2dKVP0JaMF9KqTKrYK/VnKjNYaYEvTrQA9SjyqiQWtTN1CCf1jFAY3I3+hVweUWX2SVJ8QU4dE3GmqoQ014ohJ6cLMQt5SWFTd6g+IQyLjF2z14/AaummDw4blSyJHNq4jU8OMh8aFKMobE3bNDjRVV1UW13mBoxTk1tZSHmqq6EMxLGgW1knDyELIibsGcgYXzMhVKvAL9N9RQqVtMs3pFostGj5yQVeST5MwoVRVc7u5DNvNrO6TWkzYK8bWhTilkPWmVR+jfm1Czq0C+7oRK6vHdWRRQg/w+rygzPN4pDtlo5nA9pqEc/9rdlSr4m9SoKAeqIHKVQwUICGVRiZI+5KuvocYilyg/JwVQBi4iCpS21NTV1jQVV2mCfCpxAn7Ux8AsiIiIxDlxcbOedL2v1K9RFc5H0g4o17LW5kamlqJuW50MBJ+XiwPduZZpJP1/mgg=';

export const LoginPage: React.FC = () => {
  const handleLogin = () => {
    window.location.href = '/qa-dashboard/auth/google';
  };

  return (
    <div className="min-h-screen bg-[#F4F3FF] flex items-center justify-center font-sans p-6 selection:bg-[#3C3489]/10">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[1080px] min-h-[620px] bg-white rounded-[20px] flex overflow-hidden shadow-[0_32px_64px_-16px_rgba(60,52,137,0.12)] border-[0.5px] border-[#3C3489]/10"
      >
        {/* Left Panel (52%) */}
        <div className="w-[52%] bg-[#3C3489] p-[48px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-white opacity-[0.03] rounded-full blur-[80px]" />
          
          <div className="relative z-10">
            {/* Logo Mark + Wordmark */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-[32px] h-[32px] bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0">
                <img src={`data:image/webp;base64,${LOGO_BASE64}`} alt="M" className="w-full h-auto" />
              </div>
              <span className="text-white font-bold text-[14px] tracking-tight">indiamart</span>
            </div>

            {/* Headline */}
            <div className="mb-12">
              <h1 className="text-white text-[26px] font-bold leading-[1.2] mb-3">
                QA Insight <br /> Hub
              </h1>
              <p className="text-[#AFA9EC] text-[13px] font-medium max-w-[280px]">
                Centralized monitoring platform for IndiaMART's enterprise quality excellence.
              </p>
            </div>

            {/* Feature Rows */}
            <div className="space-y-6">
              {[
                { label: 'Real-time Sync', desc: 'Auto-sync bugs from OpenProject.', icon: LayoutDashboard, color: '#6366F1' },
                { label: 'AI Readiness', desc: 'Predictive release insights via LLM.', icon: Sparkles, color: '#00A699' },
                { label: 'Deep Persistence', desc: 'Full historical analysis engine.', icon: Database, color: '#FF7043' }
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 border-[0.5px] border-white/10" style={{ backgroundColor: feature.color }}>
                    <feature.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-[#EEEDFE] text-[13px] font-bold leading-none">{feature.label}</h4>
                    <p className="text-[#7F77DD] text-[11px] mt-1 font-medium">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            {/* Avatars */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex">
                {['JD', 'AM', 'SK', 'RV'].map((initVal, i) => (
                  <div 
                    key={i} 
                    className="w-7 h-7 rounded-full border-2 border-[#3C3489] -ml-1.5 first:ml-0 flex items-center justify-center text-[9px] font-bold text-white uppercase"
                    style={{ backgroundColor: ['#6366F1', '#00A699', '#FF7043', '#3B82F6'][i] }}
                  >
                    {initVal}
                  </div>
                ))}
              </div>
              <span className="text-[#7F77DD]/80 text-[11px] font-medium tracking-wide">+24 QA engineers</span>
            </div>

            {/* SSO Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border-[0.5px] border-white/10 rounded-full">
              <ShieldCheck className="w-3 h-3 text-[#AFA9EC]" />
              <span className="text-[#AFA9EC] text-[10px] font-bold uppercase tracking-wider">
                IndiaMART SSO Integrated
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel (48%) */}
        <div className="w-[48%] bg-white p-[64px] flex flex-col justify-center items-center">
          <div className="w-full max-w-[320px] flex flex-col items-center">
            <div className="w-12 h-12 bg-[#EEEDFE] rounded-[13px] flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-[#3C3489]" />
            </div>

            <h2 className="text-[#22215C] text-[20px] font-bold mb-2">Welcome back</h2>
            <p className="text-slate-400 text-[12px] text-center leading-relaxed mb-6">
              Sign in to your corporate Google account to access the dashboard.
            </p>

            <div className="w-full h-[0.5px] bg-[#F0EFF8] mb-6" />

            <p className="text-slate-400 text-[13px] text-center mb-8 px-4 leading-relaxed">
              Login is restricted to <span className="text-[#22215C] font-bold">@indiamart.com</span> account holders only.
            </p>

            <button
              onClick={handleLogin}
              className="w-full group bg-[#3C3489] hover:bg-[#2F286E] text-white py-[13px] rounded-[12px] flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#3C3489]/10"
            >
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" className="w-3 h-3">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span className="text-[14px] font-semibold">Sign in with Google</span>
            </button>

            <a href="#" className="mt-6 text-[#AFA9EC] hover:text-[#3C3489] text-[11px] font-medium transition-colors">
              Need access? Contact your IT admin
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
