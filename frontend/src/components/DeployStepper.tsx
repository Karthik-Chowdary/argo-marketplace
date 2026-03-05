import { Step, StepLabel, Stepper, Typography, Box, alpha, CircularProgress } from '@mui/material';
import { Check as CheckIcon, Error as ErrorIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import type { DeployStep } from '../types';

interface DeployStepperProps {
  steps: DeployStep[];
  currentStep: number;
}

function StepIcon({ step }: { step: DeployStep }) {
  if (step.status === 'completed') {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 12px ${alpha('#22c55e', 0.4)}`,
          }}
        >
          <CheckIcon sx={{ fontSize: 18, color: '#fff' }} />
        </Box>
      </motion.div>
    );
  }

  if (step.status === 'running') {
    return (
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${alpha('#00d4ff', 0.2)}, ${alpha('#7c3aed', 0.2)})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={18} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (step.status === 'failed') {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 12px ${alpha('#ef4444', 0.4)}`,
          }}
        >
          <ErrorIcon sx={{ fontSize: 18, color: '#fff' }} />
        </Box>
      </motion.div>
    );
  }

  // Pending
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: `2px solid ${alpha('#fff', 0.1)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: alpha('#fff', 0.2),
        }}
      />
    </Box>
  );
}

export function DeployStepper({ steps, currentStep }: DeployStepperProps) {
  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={currentStep} orientation="vertical" sx={{ '& .MuiStepConnector-line': { borderColor: alpha('#fff', 0.06) } }}>
        {steps.map((step) => (
          <Step key={step.id} completed={step.status === 'completed'}>
            <StepLabel
              StepIconComponent={() => <StepIcon step={step} />}
              sx={{
                '& .MuiStepLabel-label': {
                  color: step.status === 'pending' ? 'text.secondary' : 'text.primary',
                  fontWeight: step.status === 'running' ? 600 : 400,
                },
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: step.status === 'running' ? 600 : 400 }}>
                {step.label}
              </Typography>
              <AnimatePresence>
                {step.message && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Typography
                      variant="body2"
                      color={step.status === 'failed' ? 'error' : 'text.secondary'}
                      sx={{ mt: 0.5 }}
                    >
                      {step.message}
                    </Typography>
                  </motion.div>
                )}
              </AnimatePresence>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}

export default DeployStepper;
